import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { ClientVehicle } from './entities/client-vehicle.entity';
import { ClientVehicleBackfill } from './entities/client-vehicle-backfill.entity';
import {
  ClientVehicleView,
  CreateClientVehicleDto,
  MAX_VEHICLES_PER_CLIENT,
  UpdateClientVehicleDto,
} from './dto/client-vehicle.dto';
import { normalizePlate } from './plate.util';

const clean = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, 50) : null;

@Injectable()
export class ClientVehiclesService {
  constructor(
    @InjectRepository(ClientVehicle)
    private readonly vehicleRepository: Repository<ClientVehicle>,
    @InjectRepository(ClientProfile)
    private readonly profileRepository: Repository<ClientProfile>,
    private readonly dataSource: DataSource,
  ) {}

  async listMine(userId: string): Promise<ClientVehicleView[]> {
    const profile = await this.getProfile(userId);
    await this.backfillLegacyVehicle(profile);
    const [vehicles, parked] = await Promise.all([
      this.vehicleRepository.find({
        where: { clientProfileId: profile.id },
        order: { createdAt: 'ASC' },
      }),
      this.parkedVehicleIds(profile.id),
    ]);
    return vehicles.map((v) => this.toView(v, parked));
  }

  async create(
    userId: string,
    dto: CreateClientVehicleDto,
  ): Promise<ClientVehicleView> {
    const profile = await this.getProfile(userId);
    await this.backfillLegacyVehicle(profile);
    const plate = this.requirePlate(dto.plate);

    const saved = await this.dataSource.transaction(async (manager) => {
      // Serializa altas concurrentes del mismo cliente para respetar el límite
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `client-vehicles:${profile.id}`,
      ]);
      const count = await manager.count(ClientVehicle, {
        where: { clientProfileId: profile.id },
      });
      if (count >= MAX_VEHICLES_PER_CLIENT) {
        throw new BadRequestException(
          `Podés registrar hasta ${MAX_VEHICLES_PER_CLIENT} vehículos`,
        );
      }
      await this.assertNoDuplicate(manager, profile.id, plate.normalized);
      return manager.save(
        manager.create(ClientVehicle, {
          clientProfileId: profile.id,
          plate: plate.original,
          plateNormalized: plate.normalized,
          vehicleType: dto.vehicleType,
          name: clean(dto.name),
          brand: clean(dto.brand),
          model: clean(dto.model),
        }),
      );
    });
    return this.toView(saved, new Set());
  }

  async update(
    userId: string,
    vehicleId: string,
    dto: UpdateClientVehicleDto,
  ): Promise<ClientVehicleView> {
    const profile = await this.getProfile(userId);
    const vehicle = await this.findMine(profile.id, vehicleId);
    const parked = await this.parkedVehicleIds(profile.id);

    if (dto.plate !== undefined) {
      const plate = this.requirePlate(dto.plate);
      if (plate.normalized !== vehicle.plateNormalized) {
        if (parked.has(vehicle.id)) {
          throw new ConflictException(
            'No podés cambiar la patente mientras el vehículo está estacionado',
          );
        }
        await this.assertNoDuplicate(
          this.dataSource.manager,
          profile.id,
          plate.normalized,
          vehicle.id,
        );
      }
      vehicle.plate = plate.original;
      vehicle.plateNormalized = plate.normalized;
    }
    if (dto.vehicleType !== undefined) {
      if (!Object.values(VehicleType).includes(dto.vehicleType))
        throw new BadRequestException('Tipo de vehículo inválido');
      vehicle.vehicleType = dto.vehicleType;
    }
    if (dto.name !== undefined) vehicle.name = clean(dto.name);
    if (dto.brand !== undefined) vehicle.brand = clean(dto.brand);
    if (dto.model !== undefined) vehicle.model = clean(dto.model);

    try {
      const saved = await this.vehicleRepository.save(vehicle);
      return this.toView(saved, parked);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505')
        throw new ConflictException('Ya tenés un vehículo con esa patente');
      throw error;
    }
  }

  async remove(userId: string, vehicleId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    const vehicle = await this.findMine(profile.id, vehicleId);
    if ((await this.parkedVehicleIds(profile.id)).has(vehicle.id)) {
      throw new ConflictException(
        'No podés eliminar un vehículo que está estacionado',
      );
    }
    await this.vehicleRepository.delete({
      id: vehicle.id,
      clientProfileId: profile.id,
    });
  }

  // ------------------------------------------------------------------ helpers

  private async getProfile(userId: string): Promise<ClientProfile> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile)
      throw new ForbiddenException(
        'Solo los clientes pueden administrar vehículos',
      );
    return profile;
  }

  private async findMine(
    clientProfileId: string,
    vehicleId: string,
  ): Promise<ClientVehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, clientProfileId },
    });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    return vehicle;
  }

  private requirePlate(raw: unknown): { original: string; normalized: string } {
    const original = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
    const normalized = normalizePlate(original);
    if (normalized.length < 5 || normalized.length > 10) {
      throw new BadRequestException(
        'La patente debe tener entre 5 y 10 letras o números',
      );
    }
    return { original: original.slice(0, 15), normalized };
  }

  private async assertNoDuplicate(
    manager: EntityManager,
    clientProfileId: string,
    normalized: string,
    excludeId?: string,
  ) {
    const existing = await manager.findOne(ClientVehicle, {
      where: { clientProfileId, plateNormalized: normalized },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Ya tenés un vehículo con esa patente');
    }
  }

  /** IDs de vehículos del cliente con un ingreso activo vinculado (Occupancy es la fuente de verdad) */
  private async parkedVehicleIds(
    clientProfileId: string,
  ): Promise<Set<string>> {
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT l.client_vehicle_id AS id
         FROM occupancy_client_links l
         JOIN occupancies o ON o.id = l.occupancy_id
        WHERE l.client_profile_id = $1 AND l.status = 'linked' AND o.is_completed = false AND l.client_vehicle_id IS NOT NULL`,
      [clientProfileId],
    );
    return new Set(rows.map((r) => r.id));
  }

  /** Copia una única vez el vehículo previo (default_vehicle_*) sin modificar client_profiles */
  private async backfillLegacyVehicle(profile: ClientProfile): Promise<void> {
    const normalized = normalizePlate(profile.defaultVehiclePlate);
    await this.dataSource.transaction(async (manager) => {
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(ClientVehicleBackfill)
        .values({ clientProfileId: profile.id })
        .orIgnore()
        .execute();
      // Con ON CONFLICT DO NOTHING, postgres no devuelve filas si ya existía la marca
      const wasNew = Array.isArray(inserted.raw) && inserted.raw.length > 0;
      if (!wasNew || normalized.length < 5) return;
      const count = await manager.count(ClientVehicle, {
        where: { clientProfileId: profile.id },
      });
      if (count > 0) return;
      await manager.save(
        manager.create(ClientVehicle, {
          clientProfileId: profile.id,
          plate: String(profile.defaultVehiclePlate)
            .trim()
            .toUpperCase()
            .slice(0, 15),
          plateNormalized: normalized.slice(0, 15),
          vehicleType:
            (profile.defaultVehicleType as unknown as VehicleType) ??
            VehicleType.CAR,
          name: null,
          brand: null,
          model: null,
        }),
      );
    });
  }

  private toView(v: ClientVehicle, parked: Set<string>): ClientVehicleView {
    return {
      id: v.id,
      name: v.name,
      brand: v.brand,
      model: v.model,
      plate: v.plate,
      vehicleType: v.vehicleType,
      isParked: parked.has(v.id),
    };
  }
}
