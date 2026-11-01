import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Occupancy } from '../occupancy/entities/occupancy.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { ClientVehicle } from '../client-vehicles/entities/client-vehicle.entity';
import {
  normalizePlate,
  sqlNormalizedPlate,
} from '../client-vehicles/plate.util';
import { OccupancyNightPolicySnapshot } from '../occupancy-services/entities/occupancy-night-policy-snapshot.entity';
import { OccupancyServiceSelection } from '../occupancy-services/entities/occupancy-service-selection.entity';
import { OccupancyServicesService } from '../occupancy-services/occupancy-services.service';
import { RatesService } from '../rates/rates.service';
import { RateHistoryService } from '../rate-history/rate-history.service';
import { TrackingNotifierService } from '../tracking-notifier/tracking-notifier.service';
import { OccupancyClientLink } from './entities/occupancy-client-link.entity';
import {
  ClientTrackingEvent,
  TrackingEventType,
} from './entities/client-tracking-event.entity';
import {
  LimitNoticeView,
  MyTrackingResponse,
  TrackingEventView,
  TrackingView,
} from './dto/client-tracking.dto';

export const MAX_ACTIVE_TRACKINGS_PER_CLIENT = 3;
export const TRACKING_REFRESH_SECONDS = 300;

const money = (n: number) =>
  `$${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

interface PendingEvent {
  userId: string;
  event: string;
  payload: Record<string, unknown>;
}

export interface CheckInTrackingResult {
  pending: PendingEvent[];
  linkedClients: number;
  skippedClients: number;
}

/**
 * Seguimiento de vehículos para clientes. No duplica la ocupación: vincula
 * clientes a la ocupación existente y deriva "activo" de occupancies.is_completed.
 */
@Injectable()
export class ClientTrackingService {
  private readonly logger = new Logger(ClientTrackingService.name);

  constructor(
    @InjectRepository(OccupancyClientLink)
    private readonly linkRepository: Repository<OccupancyClientLink>,
    @InjectRepository(ClientTrackingEvent)
    private readonly eventRepository: Repository<ClientTrackingEvent>,
    @InjectRepository(ClientProfile)
    private readonly profileRepository: Repository<ClientProfile>,
    private readonly dataSource: DataSource,
    private readonly occupancyServices: OccupancyServicesService,
    private readonly ratesService: RatesService,
    private readonly rateHistory: RateHistoryService,
    private readonly notifier: TrackingNotifierService,
  ) {}

  // ================================================================ ingreso

  /**
   * Dentro de la transacción del check-in (manual o QR), después de guardar la ocupación.
   * 1) Impide dos ingresos activos con la misma patente (normalizada) en el estacionamiento.
   * 2) Vincula a todos los clientes que tengan esa patente registrada (máx. 3 activos c/u).
   * Si falla, la transacción del ingreso se revierte y no queda ningún seguimiento.
   */
  async onCheckIn(
    manager: EntityManager,
    params: {
      occupancyId: string;
      parkingLotId: string;
      plate: string | null | undefined;
    },
  ): Promise<CheckInTrackingResult> {
    const result: CheckInTrackingResult = {
      pending: [],
      linkedClients: 0,
      skippedClients: 0,
    };
    const normalized = normalizePlate(params.plate);
    if (!normalized) return result;

    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `lot-plate:${params.parkingLotId}:${normalized}`,
    ]);
    const duplicate: unknown[] = await manager.query(
      `SELECT 1 FROM occupancies o JOIN spaces s ON s.id = o.space_id
        WHERE s.parking_lot_id = $1 AND o.is_completed = false AND o.id <> $2
          AND ${sqlNormalizedPlate('o.vehicle_plate')} = $3
        LIMIT 1`,
      [params.parkingLotId, params.occupancyId, normalized],
    );
    if (duplicate.length) {
      throw new ConflictException(
        `La patente ${String(params.plate).toUpperCase()} ya está ingresada en este estacionamiento`,
      );
    }

    const vehicles = await manager.find(ClientVehicle, {
      where: { plateNormalized: normalized },
      relations: { clientProfile: true },
    });
    if (!vehicles.length) return result;
    const lot = await manager.findOne(ParkingLot, {
      where: { id: params.parkingLotId },
      select: { id: true, name: true },
    });

    for (const vehicle of vehicles) {
      const profile = vehicle.clientProfile;
      if (!profile?.userId) continue;
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `client-tracking:${profile.id}`,
      ]);
      const activeCount = await this.countActive(manager, profile.id);
      const status =
        activeCount >= MAX_ACTIVE_TRACKINGS_PER_CLIENT
          ? 'skipped_limit'
          : 'linked';

      const link = await manager.save(
        manager.create(OccupancyClientLink, {
          occupancyId: params.occupancyId,
          parkingLotId: params.parkingLotId,
          clientProfileId: profile.id,
          userId: profile.userId,
          clientVehicleId: vehicle.id,
          vehicleName: vehicle.name,
          vehicleBrand: vehicle.brand,
          vehicleModel: vehicle.model,
          status,
        }),
      );

      const isLinked = status === 'linked';
      if (isLinked) result.linkedClients++;
      else result.skippedClients++;
      const event = await this.recordEvent(
        manager,
        link,
        isLinked ? 'checkin' : 'limit_reached',
        `${link.id}:${isLinked ? 'checkin' : 'limit'}`,
        isLinked
          ? `Tu vehículo ${vehicle.plate} ingresó a ${lot?.name ?? 'el estacionamiento'}.`
          : `Tu vehículo ${vehicle.plate} ingresó a ${lot?.name ?? 'un estacionamiento'}, pero ya tenés ${MAX_ACTIVE_TRACKINGS_PER_CLIENT} vehículos en seguimiento: este ingreso no se agregó a tu seguimiento.`,
        { plate: vehicle.plate, parkingLotName: lot?.name ?? null },
      );
      if (event)
        result.pending.push({
          userId: profile.userId,
          event: isLinked ? 'tracking:checkin' : 'tracking:limit',
          payload: this.toPayload(event),
        });
    }
    return result;
  }

  /** Después del commit del ingreso: recién ahí se notifica */
  async afterCheckIn(result: CheckInTrackingResult | undefined): Promise<void> {
    if (!result?.pending.length) return;
    for (const p of result.pending)
      await this.notifier.emitToUsers([p.userId], p.event, p.payload);
  }

  // ================================================================ egreso

  /** Después del commit del egreso. Si falla, no afecta al egreso (solo se registra). */
  async afterCheckOut(occupancyId: string): Promise<void> {
    try {
      const links = await this.linkRepository.find({
        where: { occupancyId, status: 'linked' },
      });
      if (!links.length) return;
      const occupancy = await this.dataSource.manager.findOne(Occupancy, {
        where: { id: occupancyId },
        relations: { space: { parkingLot: true } },
      });
      if (!occupancy?.isCompleted) return; // solo con egreso confirmado
      const total =
        occupancy.totalAmount != null ? Number(occupancy.totalAmount) : null;
      for (const link of links) {
        const event = await this.recordEvent(
          this.dataSource.manager,
          link,
          'checkout',
          `${link.id}:checkout`,
          `Tu vehículo ${occupancy.vehiclePlate} egresó de ${occupancy.space?.parkingLot?.name ?? 'el estacionamiento'}${total != null ? `. Total: ${money(total)}` : ''}.`,
          { plate: occupancy.vehiclePlate, totalAmount: total },
        );
        if (event)
          await this.notifier.emitToUsers(
            [link.userId],
            'tracking:checkout',
            this.toPayload(event),
          );
      }
    } catch (error) {
      this.logger.error(
        `No se pudo notificar el egreso ${occupancyId}`,
        error as Error,
      );
    }
  }

  // ================================================================ consulta del cliente

  async getMine(userId: string, now = new Date()): Promise<MyTrackingResponse> {
    const profile = await this.getProfile(userId);
    const links = await this.linkRepository
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.occupancy', 'o')
      .innerJoinAndSelect('o.space', 's')
      .innerJoinAndSelect('s.parkingLot', 'p')
      .leftJoinAndSelect('l.clientVehicle', 'v')
      .where('l.clientProfileId = :pid', { pid: profile.id })
      .orderBy('o.checkInTime', 'DESC')
      .take(50)
      .getMany();

    const linked = links.filter((l) => l.status === 'linked');
    const activeLinks = linked.filter((l) => !l.occupancy.isCompleted);
    const finishedLinks = linked
      .filter((l) => l.occupancy.isCompleted)
      .slice(0, 10);
    const limitNotices: LimitNoticeView[] = links
      .filter((l) => l.status === 'skipped_limit' && !l.occupancy.isCompleted)
      .map((l) => ({
        occupancyId: l.occupancyId,
        plate: l.occupancy.vehiclePlate ?? '',
        parkingLotName: l.occupancy.space.parkingLot.name,
        checkInTime: l.occupancy.checkInTime,
      }));

    return {
      active: await Promise.all(
        activeLinks.map((l) => this.buildView(l, now, true)),
      ),
      finished: await Promise.all(
        finishedLinks.map((l) => this.buildView(l, now, false)),
      ),
      limitNotices,
      maxActive: MAX_ACTIVE_TRACKINGS_PER_CLIENT,
      refreshSeconds: TRACKING_REFRESH_SECONDS,
    };
  }

  async getMyEvents(userId: string): Promise<TrackingEventView[]> {
    const events = await this.eventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return events.map((e) => this.toPayload(e) as unknown as TrackingEventView);
  }

  /** Avisar a los clientes vinculados que cambió algo de la ocupación (servicios, etc.) */
  async notifyOccupancyUpdate(
    occupancyId: string,
    reason: string,
  ): Promise<void> {
    const links = await this.linkRepository.find({
      where: { occupancyId, status: 'linked' },
    });
    await this.notifier.emitToUsers(
      links.map((l) => l.userId),
      'tracking:update',
      { occupancyId, reason },
    );
  }

  // Las alertas de cierre (60 y 15 min) se generan en el centro de notificaciones
  // (UserNotificationsModule · ClosingNotificationsService). Migradas desde aquí.

  // ================================================================ helpers

  private async getProfile(userId: string): Promise<ClientProfile> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile)
      throw new ForbiddenException(
        'Solo los clientes tienen seguimiento de vehículos',
      );
    return profile;
  }

  private async countActive(
    manager: EntityManager,
    clientProfileId: string,
  ): Promise<number> {
    const rows: { n: number }[] = await manager.query(
      `SELECT count(*)::int AS n FROM occupancy_client_links l JOIN occupancies o ON o.id = l.occupancy_id
        WHERE l.client_profile_id = $1 AND l.status = 'linked' AND o.is_completed = false`,
      [clientProfileId],
    );
    return rows[0]?.n ?? 0;
  }

  /** Inserta el aviso una sola vez (dedupe_key único). Devuelve null si ya existía. */
  private async recordEvent(
    manager: EntityManager,
    link: OccupancyClientLink,
    type: TrackingEventType,
    dedupeKey: string,
    message: string,
    data: Record<string, unknown>,
  ): Promise<ClientTrackingEvent | null> {
    const res = await manager
      .createQueryBuilder()
      .insert()
      .into(ClientTrackingEvent)
      .values({
        linkId: link.id,
        userId: link.userId,
        occupancyId: link.occupancyId,
        type,
        dedupeKey,
        message: message.slice(0, 300),
        data: data as never,
      })
      .orIgnore()
      .returning('*')
      .execute();
    const rows = res.raw as
      { id: string; message: string; created_at: Date }[] | undefined;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row) return null;
    return {
      id: row.id,
      linkId: link.id,
      userId: link.userId,
      occupancyId: link.occupancyId,
      type,
      dedupeKey,
      message: row.message,
      data,
      createdAt: row.created_at,
    } as ClientTrackingEvent;
  }

  private toPayload(e: ClientTrackingEvent): Record<string, unknown> {
    return {
      eventId: e.id,
      type: e.type,
      occupancyId: e.occupancyId,
      message: e.message,
      data: e.data,
      createdAt: e.createdAt,
    };
  }

  private async buildView(
    link: OccupancyClientLink,
    now: Date,
    active: boolean,
  ): Promise<TrackingView> {
    const occ = link.occupancy;
    const lot = occ.space.parkingLot;
    const manager = this.dataSource.manager;
    const [snap, selections] = await Promise.all([
      manager.findOne(OccupancyNightPolicySnapshot, {
        where: { occupancyId: occ.id },
      }),
      manager.find(OccupancyServiceSelection, {
        where: { occupancyId: occ.id },
        order: { selectedAt: 'ASC' },
      }),
    ]);

    let estimate: TrackingView['estimate'] = null;
    if (active) {
      const pricePerHour = await this.resolvePricePerHour(occ, lot.id, now);
      if (pricePerHour != null) {
        const b = await this.occupancyServices.computeCharge(
          manager,
          occ,
          pricePerHour,
          now,
        );
        estimate = { ...b, calculatedAt: now, isEstimate: true };
      }
    }
    const lines = new Map((estimate?.services ?? []).map((s) => [s.key, s]));
    const end = active ? now : (occ.checkOutTime ?? now);

    return {
      linkId: link.id,
      occupancyId: occ.id,
      status: active ? 'active' : 'finished',
      vehicle: {
        name: link.clientVehicle?.name ?? link.vehicleName,
        brand: link.clientVehicle?.brand ?? link.vehicleBrand,
        model: link.clientVehicle?.model ?? link.vehicleModel,
        plate: occ.vehiclePlate ?? link.clientVehicle?.plate ?? '',
        vehicleType: occ.vehicleType,
      },
      parkingLot: { id: lot.id, name: lot.name, address: lot.address },
      checkInTime: occ.checkInTime,
      checkOutTime: occ.checkOutTime ?? null,
      elapsedMinutes: Math.max(
        0,
        Math.floor(
          (new Date(end).getTime() - new Date(occ.checkInTime).getTime()) /
            60_000,
        ),
      ),
      currency: 'ARS',
      estimate,
      finalAmount:
        !active && occ.totalAmount != null ? Number(occ.totalAmount) : null,
      nightPolicy: snap
        ? {
            mode: snap.mode,
            nightAmount: snap.nightAmount,
            openTime: snap.openTime,
            closeTime: snap.closeTime,
            toleranceMinutes: snap.toleranceMinutes,
          }
        : null,
      services: selections.map((s) => ({
        key: s.serviceKey,
        name: s.name,
        pricingType: s.pricing?.type ?? null,
        amount: s.pricing?.amount ?? null,
        unit: s.pricing?.unit ?? null,
        status: s.status,
        estimatedSubtotal: lines.get(s.serviceKey)?.subtotal ?? 0,
      })),
    };
  }

  private async resolvePricePerHour(
    occ: Occupancy,
    parkingLotId: string,
    now: Date,
  ): Promise<number | null> {
    const snap = await this.rateHistory.findSnapshot(occ.id);
    if (snap) return Number(snap.pricePerHour);
    const rate = await this.ratesService.findApplicableRate(
      parkingLotId,
      occ.vehicleType,
      now,
    );
    return rate ? Number(rate.pricePerHour) : null;
  }
}
