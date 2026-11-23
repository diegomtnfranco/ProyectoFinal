import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { UserRole } from '../users/entities/user.entity';
import { ParkingCatalogOption } from './entities/parking-catalog-option.entity';
import { ParkingLotCatalogSelection } from './entities/parking-lot-catalog-selection.entity';
import { ParkingLotCustomService } from './entities/parking-lot-custom-service.entity';
import { ParkingLotProfile } from './entities/parking-lot-profile.entity';
import {
  CATALOG_SEED,
  CatalogOptionKind,
  LIMITS,
} from './parking-profiles.constants';
import { UpdateParkingProfileDto } from './dto/update-parking-profile.dto';
import {
  CreateCustomServiceDto,
  UpdateCustomServiceDto,
} from './dto/custom-service.dto';
import {
  CustomServiceView,
  ParkingProfileAdminView,
  ParkingProfilePublicView,
  PublicServiceView,
} from './dto/parking-profile-response.dto';
import {
  cleanText,
  emptyPricing,
  normalizePricing,
  toPricingView,
} from './pricing.util';

export interface ProfileRequester {
  id: string;
  role: string;
}

/**
 * Administración de descripción, características físicas y servicios de cada
 * estacionamiento. Módulo aislado: no modifica reservas, tarifas ni ocupación.
 */
@Injectable()
export class ParkingProfilesService implements OnModuleInit {
  private readonly logger = new Logger(ParkingProfilesService.name);

  constructor(
    @InjectRepository(ParkingLot)
    private readonly parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(ParkingCatalogOption)
    private readonly catalogRepository: Repository<ParkingCatalogOption>,
    @InjectRepository(ParkingLotProfile)
    private readonly profileRepository: Repository<ParkingLotProfile>,
    @InjectRepository(ParkingLotCatalogSelection)
    private readonly selectionRepository: Repository<ParkingLotCatalogSelection>,
    @InjectRepository(ParkingLotCustomService)
    private readonly customServiceRepository: Repository<ParkingLotCustomService>,
    private readonly dataSource: DataSource,
  ) {}

  /** Carga idempotente del catálogo: inserta códigos nuevos, nunca pisa ni borra */
  async onModuleInit(): Promise<void> {
    try {
      await this.catalogRepository
        .createQueryBuilder()
        .insert()
        .into(ParkingCatalogOption)
        .values(CATALOG_SEED.map((item) => ({ ...item, isActive: true })))
        .orIgnore()
        .execute();
    } catch (error) {
      this.logger.error(
        'No se pudo inicializar el catálogo de características y servicios',
        error as Error,
      );
    }
  }

  // ---------------------------------------------------------------- lectura

  async getPublicProfile(
    parkingLotId: string,
  ): Promise<ParkingProfilePublicView> {
    const lot = await this.parkingLotRepository.findOne({
      where: { id: parkingLotId, isActive: true },
      select: { id: true, address: true },
    });
    if (!lot) throw new NotFoundException('Estacionamiento no encontrado');

    const [profile, catalog, selections, customServices] = await Promise.all([
      this.profileRepository.findOne({ where: { parkingLotId } }),
      this.getCatalog(),
      this.selectionRepository.find({
        where: { parkingLotId, isEnabled: true },
      }),
      this.customServiceRepository.find({
        where: { parkingLotId, isActive: true },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const byOption = new Map(selections.map((s) => [s.optionId, s]));

    const physicalFeatures = catalog
      .filter(
        (o) =>
          o.kind === CatalogOptionKind.PHYSICAL_FEATURE && byOption.has(o.id),
      )
      .map((o) => ({
        code: o.code,
        name: o.name,
        notes: byOption.get(o.id)!.notes ?? null,
      }));

    const services: PublicServiceView[] = [];
    for (const option of catalog.filter(
      (o) => o.kind === CatalogOptionKind.SERVICE,
    )) {
      const sel = byOption.get(option.id);
      const pricing = toPricingView(sel?.pricing);
      if (!sel || !pricing) continue; // sin precio definido no se publica (evita importes ambiguos)
      services.push({
        source: 'catalog',
        key: option.code,
        name: option.name,
        description: sel.notes ?? option.description ?? null,
        conditions: sel.conditions ?? null,
        pricing,
      });
    }
    for (const custom of customServices) {
      const pricing = toPricingView(custom.pricing);
      if (!pricing) continue;
      services.push({
        source: 'custom',
        key: custom.id,
        name: custom.title,
        description: custom.description ?? null,
        conditions: custom.conditions ?? null,
        pricing,
      });
    }

    const description = profile?.description?.trim()
      ? profile.description
      : null;
    return {
      parkingLotId: lot.id,
      address: lot.address,
      description,
      physicalFeatures,
      services,
      hasDetails:
        !!description || physicalFeatures.length > 0 || services.length > 0,
    };
  }

  async getAdminProfile(
    parkingLotId: string,
    user: ProfileRequester,
  ): Promise<ParkingProfileAdminView> {
    const lot = await this.assertOwner(parkingLotId, user);
    return this.buildAdminView(lot);
  }

  // ---------------------------------------------------------------- escritura

  async updateProfile(
    parkingLotId: string,
    dto: UpdateParkingProfileDto,
    user: ProfileRequester,
  ): Promise<ParkingProfileAdminView> {
    const lot = await this.assertOwner(parkingLotId, user);
    const catalog = await this.getCatalog();
    const byCode = new Map(catalog.map((o) => [o.code, o]));

    const features = this.resolveItems(
      dto.physicalFeatures,
      byCode,
      CatalogOptionKind.PHYSICAL_FEATURE,
      'característica',
    );
    const services = this.resolveItems(
      dto.services,
      byCode,
      CatalogOptionKind.SERVICE,
      'servicio',
    );

    // Validar todo antes de escribir
    const preparedServices = services.map(({ item, option }) => {
      const pricing = item.pricing ? normalizePricing(item.pricing) : null;
      if (item.enabled && !pricing) {
        throw new BadRequestException(
          `Indicá la modalidad de cobro de "${option.name}" para activarlo`,
        );
      }
      return {
        option,
        enabled: item.enabled,
        notes: cleanText(
          item.notes,
          LIMITS.notes,
          'La descripción del servicio',
        ),
        conditions: cleanText(
          item.conditions,
          LIMITS.conditions,
          'Las condiciones',
        ),
        pricing,
      };
    });
    const preparedFeatures = features.map(({ item, option }) => ({
      option,
      enabled: item.enabled,
      notes: cleanText(item.notes, LIMITS.notes, 'La aclaración'),
    }));
    const description =
      dto.description === undefined
        ? undefined
        : cleanText(dto.description, LIMITS.description, 'La descripción');

    await this.dataSource.transaction(async (manager) => {
      if (description !== undefined) {
        await manager
          .getRepository(ParkingLotProfile)
          .save({ parkingLotId: lot.id, description });
      }

      const optionIds = [...preparedFeatures, ...preparedServices].map(
        (p) => p.option.id,
      );
      if (optionIds.length === 0) return;

      const selectionRepo = manager.getRepository(ParkingLotCatalogSelection);
      const existing = await selectionRepo.find({
        where: { parkingLotId: lot.id, optionId: In(optionIds) },
      });
      const existingByOption = new Map(existing.map((s) => [s.optionId, s]));

      const toSave: ParkingLotCatalogSelection[] = [];
      for (const f of preparedFeatures) {
        const sel =
          existingByOption.get(f.option.id) ??
          selectionRepo.create({ parkingLotId: lot.id, optionId: f.option.id });
        sel.isEnabled = f.enabled;
        sel.notes = f.notes;
        sel.conditions = null;
        sel.pricing = emptyPricing();
        toSave.push(sel);
      }
      for (const s of preparedServices) {
        const sel =
          existingByOption.get(s.option.id) ??
          selectionRepo.create({ parkingLotId: lot.id, optionId: s.option.id });
        sel.isEnabled = s.enabled;
        sel.notes = s.notes;
        sel.conditions = s.conditions;
        // Desactivar sin enviar precio conserva el precio anterior
        sel.pricing = s.pricing ?? sel.pricing ?? emptyPricing();
        toSave.push(sel);
      }
      await selectionRepo.save(toSave);
    });

    return this.buildAdminView(lot);
  }

  async createCustomService(
    parkingLotId: string,
    dto: CreateCustomServiceDto,
    user: ProfileRequester,
  ): Promise<CustomServiceView> {
    const lot = await this.assertOwner(parkingLotId, user);
    const title = this.requireTitle(dto.title);
    const pricing = normalizePricing(dto.pricing);

    const count = await this.customServiceRepository.count({
      where: { parkingLotId: lot.id },
    });
    if (count >= LIMITS.customServicesPerLot) {
      throw new BadRequestException(
        `Se permiten hasta ${LIMITS.customServicesPerLot} servicios personalizados`,
      );
    }
    await this.assertUniqueTitle(lot.id, title);

    const entity = this.customServiceRepository.create({
      parkingLotId: lot.id,
      title,
      description: cleanText(
        dto.description,
        LIMITS.serviceDescription,
        'La descripción',
      ),
      conditions: cleanText(
        dto.conditions,
        LIMITS.conditions,
        'Las condiciones',
      ),
      isActive: dto.isActive ?? true,
      pricing,
    });
    const saved = await this.customServiceRepository.save(entity);
    return this.toCustomView(saved);
  }

  async updateCustomService(
    parkingLotId: string,
    serviceId: string,
    dto: UpdateCustomServiceDto,
    user: ProfileRequester,
  ): Promise<CustomServiceView> {
    const lot = await this.assertOwner(parkingLotId, user);
    const service = await this.findCustomServiceOrFail(lot.id, serviceId);

    if (dto.title !== undefined) {
      const title = this.requireTitle(dto.title);
      if (title.toLowerCase() !== service.title.toLowerCase())
        await this.assertUniqueTitle(lot.id, title, service.id);
      service.title = title;
    }
    if (dto.description !== undefined)
      service.description = cleanText(
        dto.description,
        LIMITS.serviceDescription,
        'La descripción',
      );
    if (dto.conditions !== undefined)
      service.conditions = cleanText(
        dto.conditions,
        LIMITS.conditions,
        'Las condiciones',
      );
    if (dto.isActive !== undefined) service.isActive = dto.isActive;
    if (dto.pricing !== undefined)
      service.pricing = normalizePricing(dto.pricing);

    const saved = await this.customServiceRepository.save(service);
    return this.toCustomView(saved);
  }

  async deleteCustomService(
    parkingLotId: string,
    serviceId: string,
    user: ProfileRequester,
  ): Promise<void> {
    const lot = await this.assertOwner(parkingLotId, user);
    const service = await this.findCustomServiceOrFail(lot.id, serviceId);
    await this.customServiceRepository.delete({
      id: service.id,
      parkingLotId: lot.id,
    });
  }

  // ---------------------------------------------------------------- helpers

  /** Solo el dueño del estacionamiento puede administrarlo (empleados y admin no) */
  private async assertOwner(
    parkingLotId: string,
    user: ProfileRequester,
  ): Promise<ParkingLot> {
    if (!user || (user.role as UserRole) !== UserRole.PARKING_OWNER) {
      throw new ForbiddenException(
        'Solo el dueño puede administrar esta información',
      );
    }
    const lot = await this.parkingLotRepository.findOne({
      where: { id: parkingLotId },
      relations: { owner: true },
    });
    if (!lot) throw new NotFoundException('Estacionamiento no encontrado');
    if (!lot.owner || lot.owner.userId !== user.id) {
      throw new ForbiddenException(
        'No tenés permiso para administrar este estacionamiento',
      );
    }
    return lot;
  }

  private getCatalog(): Promise<ParkingCatalogOption[]> {
    return this.catalogRepository.find({
      where: { isActive: true },
      order: { kind: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  private resolveItems<T extends { code: string }>(
    items: T[] | undefined,
    byCode: Map<string, ParkingCatalogOption>,
    kind: CatalogOptionKind,
    label: string,
  ): { item: T; option: ParkingCatalogOption }[] {
    if (!items) return [];
    const seen = new Set<string>();
    return items.map((item) => {
      if (seen.has(item.code))
        throw new BadRequestException(
          `La ${label} "${item.code}" está repetida`,
        );
      seen.add(item.code);
      const option = byCode.get(item.code);
      if (!option || option.kind !== kind) {
        throw new BadRequestException(
          `La ${label} "${item.code}" no existe en el catálogo`,
        );
      }
      return { item, option };
    });
  }

  private requireTitle(title: unknown): string {
    const clean = cleanText(title, LIMITS.title, 'El título');
    if (!clean) throw new BadRequestException('El título es obligatorio');
    return clean;
  }

  private async assertUniqueTitle(
    parkingLotId: string,
    title: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.customServiceRepository
      .createQueryBuilder('cs')
      .where('cs.parkingLotId = :parkingLotId', { parkingLotId })
      .andWhere('LOWER(cs.title) = LOWER(:title)', { title });
    if (excludeId) qb.andWhere('cs.id != :excludeId', { excludeId });
    if ((await qb.getCount()) > 0) {
      throw new ConflictException(
        'Ya existe un servicio con ese título en este estacionamiento',
      );
    }
  }

  private async findCustomServiceOrFail(
    parkingLotId: string,
    serviceId: string,
  ): Promise<ParkingLotCustomService> {
    // Filtrar por estacionamiento evita modificar servicios de otro establecimiento
    const service = await this.customServiceRepository.findOne({
      where: { id: serviceId, parkingLotId },
    });
    if (!service)
      throw new NotFoundException(
        'Servicio no encontrado en este estacionamiento',
      );
    return service;
  }

  private async buildAdminView(
    lot: ParkingLot,
  ): Promise<ParkingProfileAdminView> {
    const [profile, catalog, selections, customServices] = await Promise.all([
      this.profileRepository.findOne({ where: { parkingLotId: lot.id } }),
      this.getCatalog(),
      this.selectionRepository.find({ where: { parkingLotId: lot.id } }),
      this.customServiceRepository.find({
        where: { parkingLotId: lot.id },
        order: { createdAt: 'ASC' },
      }),
    ]);
    const byOption = new Map(selections.map((s) => [s.optionId, s]));

    return {
      parkingLotId: lot.id,
      parkingLotName: lot.name,
      address: lot.address,
      description: profile?.description ?? null,
      physicalFeatures: catalog
        .filter((o) => o.kind === CatalogOptionKind.PHYSICAL_FEATURE)
        .map((o) => ({
          code: o.code,
          name: o.name,
          catalogDescription: o.description ?? null,
          enabled: byOption.get(o.id)?.isEnabled ?? false,
          notes: byOption.get(o.id)?.notes ?? null,
        })),
      services: catalog
        .filter((o) => o.kind === CatalogOptionKind.SERVICE)
        .map((o) => {
          const sel = byOption.get(o.id);
          return {
            code: o.code,
            name: o.name,
            catalogDescription: o.description ?? null,
            enabled: sel?.isEnabled ?? false,
            notes: sel?.notes ?? null,
            conditions: sel?.conditions ?? null,
            pricing: toPricingView(sel?.pricing),
          };
        }),
      customServices: customServices.map((c) => this.toCustomView(c)),
    };
  }

  private toCustomView(c: ParkingLotCustomService): CustomServiceView {
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? null,
      conditions: c.conditions ?? null,
      isActive: c.isActive,
      pricing: toPricingView(c.pricing),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
