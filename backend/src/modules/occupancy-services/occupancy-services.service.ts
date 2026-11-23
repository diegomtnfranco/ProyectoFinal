import {
  Optional,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Occupancy } from '../occupancy/entities/occupancy.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ParkingLotsService } from '../parking-lots/parking-lots.service';
import { ParkingCatalogOption } from '../parking-profiles/entities/parking-catalog-option.entity';
import { ParkingLotCatalogSelection } from '../parking-profiles/entities/parking-lot-catalog-selection.entity';
import { ParkingLotCustomService } from '../parking-profiles/entities/parking-lot-custom-service.entity';
import { ParkingLotNightPolicy } from '../parking-profiles/entities/parking-lot-night-policy.entity';
import { ServicePricing } from '../parking-profiles/entities/service-pricing.embedded';
import {
  BUSINESS_TIME_ZONE,
  CatalogOptionKind,
  NIGHT_TOLERANCE_MINUTES,
  NightRateMode,
} from '../parking-profiles/parking-profiles.constants';
import { toPricingView } from '../parking-profiles/pricing.util';
import {
  AccessRequester,
  ParkingLotAccessService,
} from '../parking-profiles/parking-lot-access.service';
import {
  OccupancyServiceSelection,
  ServiceSelectionVia,
} from './entities/occupancy-service-selection.entity';
import { OccupancyNightPolicySnapshot } from './entities/occupancy-night-policy-snapshot.entity';
import {
  ChargeBreakdown,
  computeParkingCharge,
  computeServicesCharge,
} from './charge-calculator';
import {
  CheckInServicesResult,
  OccupancyServicesView,
  OfferedServiceView,
  SERVICE_KEY_REGEX,
  SelectedServiceView,
} from './dto/occupancy-services.dto';
import { TrackingNotifierService } from '../tracking-notifier/tracking-notifier.service';
import {
  SERVICE_EXECUTION_STATUSES,
  ServiceExecutionStatus,
} from './entities/occupancy-service-selection.entity';

const MAX_KEYS = 30;

/**
 * Servicios por ocupación, política nocturna congelada y cálculo del importe.
 * El checkout existente delega acá el cálculo para que haya una sola lógica.
 */
@Injectable()
export class OccupancyServicesService {
  constructor(
    @InjectRepository(OccupancyServiceSelection)
    private readonly selectionRepository: Repository<OccupancyServiceSelection>,
    @InjectRepository(OccupancyNightPolicySnapshot)
    private readonly nightSnapshotRepository: Repository<OccupancyNightPolicySnapshot>,
    @InjectRepository(Occupancy)
    private readonly occupancyRepository: Repository<Occupancy>,
    private readonly dataSource: DataSource,
    private readonly parkingLotsService: ParkingLotsService,
    private readonly access: ParkingLotAccessService,
    // Opcional: avisa a los clientes vinculados que cambiaron los servicios
    @Optional()
    private readonly notifier?: TrackingNotifierService,
  ) {}

  // ------------------------------------------------------------ oferta

  /** Servicios activos y con modalidad de cobro definida del estacionamiento */
  async listOffered(
    parkingLotId: string,
    manager?: EntityManager,
  ): Promise<OfferedServiceView[]> {
    const em = manager ?? this.dataSource.manager;
    const [catalog, selections, customs] = await Promise.all([
      em.find(ParkingCatalogOption, {
        where: { kind: CatalogOptionKind.SERVICE, isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      em.find(ParkingLotCatalogSelection, {
        where: { parkingLotId, isEnabled: true },
      }),
      em.find(ParkingLotCustomService, {
        where: { parkingLotId, isActive: true },
        order: { createdAt: 'ASC' },
      }),
    ]);
    const byOption = new Map(selections.map((s) => [s.optionId, s]));
    const offered: OfferedServiceView[] = [];
    for (const option of catalog) {
      const sel = byOption.get(option.id);
      const pricing = toPricingView(sel?.pricing);
      if (!sel || !pricing) continue;
      offered.push({
        key: `catalog:${option.code}`,
        source: 'catalog',
        name: option.name,
        description: sel.notes ?? option.description ?? null,
        conditions: sel.conditions ?? null,
        pricing,
      });
    }
    for (const c of customs) {
      const pricing = toPricingView(c.pricing);
      if (!pricing) continue;
      offered.push({
        key: `custom:${c.id}`,
        source: 'custom',
        name: c.title,
        description: c.description ?? null,
        conditions: c.conditions ?? null,
        pricing,
      });
    }
    return offered;
  }

  /** Público: servicios del estacionamiento dueño del QR de ingreso */
  async listForQrToken(token: string): Promise<OfferedServiceView[]> {
    if (!token || typeof token !== 'string')
      throw new BadRequestException('QR inválido');
    const lot = await this.parkingLotsService.validateQRToken(
      token,
      'check-in',
    );
    return this.listOffered(lot.id);
  }

  /** Dueño o empleado del estacionamiento (formulario de ingreso manual) */
  async listForStaff(
    parkingLotId: string,
    user: AccessRequester,
  ): Promise<OfferedServiceView[]> {
    await this.access.assertStaff(parkingLotId, user);
    return this.listOffered(parkingLotId);
  }

  // ------------------------------------------------------------ ingreso

  /**
   * Llamado dentro de la transacción del check-in. Congela la política nocturna
   * y guarda los servicios elegidos. Los identificadores que no corresponden a
   * un servicio ofrecido por ESTE estacionamiento se ignoran (nunca se asocian)
   * para no bloquear el ingreso; se informan en `ignoredServiceKeys`.
   */
  async onCheckIn(
    manager: EntityManager,
    params: {
      occupancyId: string;
      parkingLotId: string;
      serviceKeys?: unknown;
      via: ServiceSelectionVia;
      userId: string | null;
    },
  ): Promise<CheckInServicesResult> {
    await this.snapshotNightPolicy(
      manager,
      params.occupancyId,
      params.parkingLotId,
    );

    const keys = this.sanitizeKeys(params.serviceKeys);
    if (keys.length === 0) return { selected: [], ignoredServiceKeys: [] };

    const offered = new Map(
      (await this.listOffered(params.parkingLotId, manager)).map((o) => [
        o.key,
        o,
      ]),
    );
    const valid = keys.filter((k) => offered.has(k));
    const ignoredServiceKeys = keys.filter((k) => !offered.has(k));

    const rows = valid.map((k) =>
      this.buildSelection(
        manager,
        params.occupancyId,
        params.parkingLotId,
        offered.get(k)!,
        params.via,
        params.userId,
      ),
    );
    if (rows.length) await manager.save(rows);
    return {
      selected: rows.map((r) => ({
        key: r.serviceKey,
        name: r.name,
        pricing: toPricingView(r.pricing),
      })),
      ignoredServiceKeys,
    };
  }

  private async snapshotNightPolicy(
    manager: EntityManager,
    occupancyId: string,
    parkingLotId: string,
  ): Promise<void> {
    const [lot, policy] = await Promise.all([
      manager.findOne(ParkingLot, {
        where: { id: parkingLotId },
        select: { id: true, openTime: true, closeTime: true },
      }),
      manager.findOne(ParkingLotNightPolicy, { where: { parkingLotId } }),
    ]);
    if (!lot) return;
    await manager.save(
      manager.create(OccupancyNightPolicySnapshot, {
        occupancyId,
        mode: policy?.mode ?? NightRateMode.HOURLY,
        nightAmount: policy?.nightAmount ?? null,
        openTime: String(lot.openTime ?? '').slice(0, 5),
        closeTime: String(lot.closeTime ?? '').slice(0, 5),
        toleranceMinutes: NIGHT_TOLERANCE_MINUTES,
      }),
    );
  }

  // ------------------------------------------------------------ edición posterior

  async getForSpace(
    spaceId: string,
    user: AccessRequester,
  ): Promise<OccupancyServicesView> {
    const occupancy = await this.occupancyRepository.findOne({
      where: { spaceId, isCompleted: false },
      relations: { space: true },
      order: { checkInTime: 'DESC' },
    });
    if (!occupancy)
      throw new NotFoundException(
        'No hay un vehículo estacionado en este espacio',
      );
    await this.access.assertStaff(occupancy.space.parkingLotId, user);
    return this.buildView(occupancy);
  }

  async updateForOccupancy(
    occupancyId: string,
    serviceKeys: unknown,
    user: AccessRequester,
  ): Promise<OccupancyServicesView> {
    const occupancy = await this.occupancyRepository.findOne({
      where: { id: occupancyId },
      relations: { space: true },
    });
    if (!occupancy) throw new NotFoundException('Ocupación no encontrada');
    const parkingLotId = occupancy.space.parkingLotId;
    await this.access.assertStaff(parkingLotId, user);
    if (occupancy.isCompleted || occupancy.checkOutTime) {
      throw new ConflictException(
        'El vehículo ya egresó: no se pueden modificar sus servicios',
      );
    }

    const keys = this.sanitizeKeys(serviceKeys, true);

    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.find(OccupancyServiceSelection, {
        where: { occupancyId },
      });
      const existingKeys = new Set(existing.map((e) => e.serviceKey));
      const offered = new Map(
        (await this.listOffered(parkingLotId, manager)).map((o) => [o.key, o]),
      );

      // Agregar solo servicios ofrecidos por este estacionamiento; los ya elegidos conservan su precio congelado
      const toAdd = keys.filter((k) => !existingKeys.has(k));
      const invalid = toAdd.filter((k) => !offered.has(k));
      if (invalid.length) {
        throw new BadRequestException(
          'Algunos servicios no están disponibles en este estacionamiento',
        );
      }
      const toRemove = existing.filter((e) => !keys.includes(e.serviceKey));
      if (toRemove.length) {
        await manager.delete(OccupancyServiceSelection, {
          occupancyId,
          id: In(toRemove.map((r) => r.id)),
        });
      }
      const rows = toAdd.map((k) =>
        this.buildSelection(
          manager,
          occupancyId,
          parkingLotId,
          offered.get(k)!,
          'edit',
          user.id,
        ),
      );
      if (rows.length) await manager.save(rows);
    });

    await this.notifyLinkedClients(occupancyId, 'services');
    return this.buildView(occupancy);
  }

  /**
   * Personal del estacionamiento: marca si un servicio seleccionado se realizó.
   * Regla confirmada: se cobra lo seleccionado salvo que esté como 'not_performed'.
   */
  async setServiceStatus(
    occupancyId: string,
    serviceKey: string,
    status: ServiceExecutionStatus,
    user: AccessRequester,
  ): Promise<OccupancyServicesView> {
    if (!SERVICE_EXECUTION_STATUSES.includes(status)) {
      throw new BadRequestException(
        'Estado inválido (selected, performed o not_performed)',
      );
    }
    if (!SERVICE_KEY_REGEX.test(serviceKey ?? '')) {
      throw new BadRequestException('Identificador de servicio inválido');
    }
    const occupancy = await this.occupancyRepository.findOne({
      where: { id: occupancyId },
      relations: { space: true },
    });
    if (!occupancy) throw new NotFoundException('Ocupación no encontrada');
    await this.access.assertStaff(occupancy.space.parkingLotId, user);
    if (occupancy.isCompleted || occupancy.checkOutTime) {
      throw new ConflictException(
        'El vehículo ya egresó: no se puede modificar el estado de sus servicios',
      );
    }
    const selection = await this.selectionRepository.findOne({
      where: { occupancyId, serviceKey },
    });
    if (!selection)
      throw new NotFoundException(
        'Ese servicio no fue seleccionado para este vehículo',
      );
    await this.selectionRepository.update(
      { id: selection.id, occupancyId },
      { status, statusUpdatedBy: user.id, statusUpdatedAt: new Date() },
    );
    await this.notifyLinkedClients(occupancyId, 'service-status');
    return this.buildView(occupancy);
  }

  private async notifyLinkedClients(
    occupancyId: string,
    reason: string,
  ): Promise<void> {
    if (!this.notifier) return;
    try {
      const rows: { user_id: string }[] = await this.dataSource.query(
        `SELECT user_id FROM occupancy_client_links WHERE occupancy_id = $1 AND status = 'linked'`,
        [occupancyId],
      );
      await this.notifier.emitToUsers(
        rows.map((r) => r.user_id),
        'tracking:update',
        { occupancyId, reason },
      );
    } catch {
      // La tabla puede no existir todavía si el módulo de seguimiento no está cargado
    }
  }

  // ------------------------------------------------------------ cálculo

  /**
   * Importe de una estadía con la política nocturna congelada al ingresar
   * (o HOURLY si la ocupación es anterior a esta funcionalidad) y los
   * servicios seleccionados con su precio congelado.
   */
  async computeCharge(
    manager: EntityManager,
    occupancy: { id: string; checkInTime: Date },
    pricePerHour: number,
    checkOutTime: Date,
  ): Promise<ChargeBreakdown> {
    const [snapshot, selections] = await Promise.all([
      manager.findOne(OccupancyNightPolicySnapshot, {
        where: { occupancyId: occupancy.id },
      }),
      manager.find(OccupancyServiceSelection, {
        where: { occupancyId: occupancy.id },
        order: { selectedAt: 'ASC' },
      }),
    ]);
    const checkIn = new Date(occupancy.checkInTime);
    const parking = computeParkingCharge({
      checkIn,
      checkOut: checkOutTime,
      pricePerHour,
      policy: snapshot
        ? {
            mode: snapshot.mode,
            nightAmount:
              snapshot.nightAmount != null
                ? Number(snapshot.nightAmount)
                : null,
            openTime: snapshot.openTime,
            closeTime: snapshot.closeTime,
            toleranceMinutes: snapshot.toleranceMinutes,
          }
        : null,
      timeZone: BUSINESS_TIME_ZONE,
    });
    const services = computeServicesCharge(
      selections.map((s) => ({
        key: s.serviceKey,
        name: s.name,
        pricing: {
          type: s.pricing?.type ?? null,
          amount: s.pricing?.amount ?? null,
          unit: s.pricing?.unit ?? null,
        },
        status: s.status,
      })),
      checkOutTime.getTime() - checkIn.getTime(),
    );
    return {
      ...parking,
      services: services.lines,
      servicesAmount: services.total,
      total: Math.round((parking.parkingAmount + services.total) * 100) / 100,
      parkingSource: 'calculated',
    };
  }

  // ------------------------------------------------------------ helpers

  private sanitizeKeys(raw: unknown, strict = false): string[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      if (strict)
        throw new BadRequestException('serviceKeys debe ser una lista');
      return [];
    }
    if (raw.length > MAX_KEYS)
      throw new BadRequestException(`Se permiten hasta ${MAX_KEYS} servicios`);
    const keys = [
      ...new Set(
        raw
          .filter((k): k is string => typeof k === 'string')
          .map((k) => k.trim()),
      ),
    ];
    const malformed = keys.filter((k) => !SERVICE_KEY_REGEX.test(k));
    if (malformed.length && strict)
      throw new BadRequestException('Identificador de servicio inválido');
    return keys.filter((k) => SERVICE_KEY_REGEX.test(k));
  }

  private buildSelection(
    manager: EntityManager,
    occupancyId: string,
    parkingLotId: string,
    offered: OfferedServiceView,
    via: ServiceSelectionVia,
    userId: string | null,
  ): OccupancyServiceSelection {
    const pricing = new ServicePricing();
    pricing.type = offered.pricing.type;
    pricing.amount = offered.pricing.amount;
    pricing.unit = offered.pricing.unit;
    pricing.currency = offered.pricing.currency;
    return manager.create(OccupancyServiceSelection, {
      occupancyId,
      parkingLotId,
      serviceKey: offered.key,
      source: offered.source,
      name: offered.name,
      pricing,
      selectedVia: via,
      selectedBy: userId,
    });
  }

  private async buildView(
    occupancy: Occupancy,
  ): Promise<OccupancyServicesView> {
    const parkingLotId = occupancy.space.parkingLotId;
    const [offered, selected] = await Promise.all([
      this.listOffered(parkingLotId),
      this.selectionRepository.find({
        where: { occupancyId: occupancy.id },
        order: { selectedAt: 'ASC' },
      }),
    ]);
    const offeredKeys = new Set(offered.map((o) => o.key));
    return {
      occupancyId: occupancy.id,
      spaceId: occupancy.spaceId,
      spaceNumber: occupancy.space?.spaceNumber ?? null,
      vehiclePlate: occupancy.vehiclePlate ?? null,
      offered,
      selected: selected.map((s): SelectedServiceView => ({
        key: s.serviceKey,
        name: s.name,
        pricing: toPricingView(s.pricing),
        selectedVia: s.selectedVia,
        selectedAt: s.selectedAt,
        noLongerOffered: !offeredKeys.has(s.serviceKey),
        status: s.status ?? 'selected',
      })),
    };
  }
}
