// src/modules/rate-history/rate-history.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { RateChangeAction, RateChangeLog } from './entities/rate-change-log.entity';
import { OccupancyRateSnapshot } from './entities/occupancy-rate-snapshot.entity';
import { User } from '../users/entities/user.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';

export interface RateRef {
  id: string;
  parkingLotId: string;
  vehicleType: VehicleType;
  pricePerHour: number | string;
}

const toNumber = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v);

@Injectable()
export class RateHistoryService {
  private readonly logger = new Logger(RateHistoryService.name);

  constructor(
    @InjectRepository(RateChangeLog)
    private readonly changeLogRepository: Repository<RateChangeLog>,
    @InjectRepository(OccupancyRateSnapshot)
    private readonly snapshotRepository: Repository<OccupancyRateSnapshot>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ParkingOwner)
    private readonly ownerRepository: Repository<ParkingOwner>,
    @InjectRepository(ParkingEmployee)
    private readonly employeeRepository: Repository<ParkingEmployee>,
  ) {}

  // ───────────────────────── Historial de cambios ─────────────────────────

  /**
   * Registra un alta/edición/baja de tarifa. Nunca lanza: si falla el log,
   * la operación sobre la tarifa (que ya se guardó) no debe devolver error.
   */
  async recordChange(params: {
    action: RateChangeAction;
    rate: Pick<RateRef, 'id' | 'parkingLotId' | 'vehicleType'>;
    previousPricePerHour: number | string | null;
    newPricePerHour: number | string | null;
    userId: string | null;
  }): Promise<void> {
    try {
      const author = params.userId ? await this.resolveAuthor(params.userId) : { name: null, email: null };
      await this.changeLogRepository.save(
        this.changeLogRepository.create({
          parkingLotId: params.rate.parkingLotId,
          rateId: params.rate.id,
          vehicleType: params.rate.vehicleType,
          action: params.action,
          previousPricePerHour: toNumber(params.previousPricePerHour),
          newPricePerHour: toNumber(params.newPricePerHour),
          changedByUserId: params.userId,
          changedByName: author.name,
          changedByEmail: author.email,
        }),
      );
    } catch (error) {
      this.logger.warn(`No se pudo registrar el cambio de tarifa ${params.rate.id}: ${(error as Error).message}`);
    }
  }

  findChanges(parkingLotId: string, take: number): Promise<RateChangeLog[]> {
    return this.changeLogRepository.find({
      where: { parkingLotId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  countChanges(parkingLotId: string): Promise<number> {
    return this.changeLogRepository.count({ where: { parkingLotId } });
  }

  /** Nombre visible: perfil de dueño o empleado; si no hay, el email. */
  private async resolveAuthor(userId: string): Promise<{ name: string | null; email: string | null }> {
    const [user, owner, employee] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId }, select: { id: true, email: true } }),
      this.ownerRepository.findOne({ where: { userId }, select: { id: true, name: true } }),
      this.employeeRepository.findOne({ where: { userId }, select: { id: true, name: true } }),
    ]);
    return {
      name: owner?.name ?? employee?.name ?? null,
      email: user?.email ?? null,
    };
  }

  // ──────────────────── Tarifa congelada por ocupación ────────────────────

  /** Guarda el precio vigente al ingreso, dentro de la misma transacción del check-in. */
  async snapshotForOccupancy(manager: EntityManager, occupancyId: string, rate: RateRef): Promise<void> {
    await manager.save(
      manager.create(OccupancyRateSnapshot, {
        occupancyId,
        rateId: rate.id,
        vehicleType: rate.vehicleType,
        pricePerHour: Number(rate.pricePerHour),
      }),
    );
  }

  async findSnapshot(occupancyId: string, manager?: EntityManager): Promise<OccupancyRateSnapshot | null> {
    const repo = manager ? manager.getRepository(OccupancyRateSnapshot) : this.snapshotRepository;
    return repo.findOne({ where: { occupancyId } });
  }

  /** Precio por hora congelado de varias ocupaciones (para el feed de actividad). */
  async findSnapshotPrices(occupancyIds: string[]): Promise<Map<string, number>> {
    if (occupancyIds.length === 0) return new Map();
    const rows = await this.snapshotRepository.find({ where: { occupancyId: In(occupancyIds) } });
    return new Map(rows.map((r) => [r.occupancyId, Number(r.pricePerHour)]));
  }
}
