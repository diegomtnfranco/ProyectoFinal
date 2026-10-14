import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Occupancy } from '../occupancy/entities/occupancy.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { RatesService } from '../rates/rates.service';
import { UserRole } from '../users/entities/user.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { ActivityItemDto, PaginatedActivityDto } from './dto/activity-response.dto';
import { ActivityType } from './dto/find-activity.dto';

export interface ActivityRequester {
  id: string;
  role: string;
}

/**
 * Servicio de solo lectura que arma el feed de "Últimas actividades"
 * combinando ocupaciones (ingresos/egresos) y reservas.
 * No modifica ninguna tabla ni otros servicios existentes.
 */
@Injectable()
export class ActivityService {
  static readonly MAX_WINDOW = 500;

  constructor(
    @InjectRepository(Occupancy)
    private readonly occupancyRepository: Repository<Occupancy>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(ParkingLot)
    private readonly parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(ParkingEmployee)
    private readonly parkingEmployeeRepository: Repository<ParkingEmployee>,
    private readonly ratesService: RatesService,
  ) {}

  /** Últimas N actividades (por defecto 3) para el panel del dashboard. */
  async getRecent(parkingLotId: string, user: ActivityRequester, limit = 3): Promise<ActivityItemDto[]> {
    await this.assertCanAccess(parkingLotId, user);
    const { items } = await this.collect(parkingLotId, 1, limit);
    return items;
  }

  /** Listado paginado para la página "Actividad". */
  async findPaginated(
    parkingLotId: string,
    user: ActivityRequester,
    page = 1,
    limit = 10,
    type?: ActivityType,
  ): Promise<PaginatedActivityDto> {
    await this.assertCanAccess(parkingLotId, user);
    const { items, total } = await this.collect(parkingLotId, page, limit, type, true);
    return { items, page, limit, total, hasMore: page * limit < total };
  }

  // ---------------------------------------------------------------------------

  private async collect(
    parkingLotId: string,
    page: number,
    limit: number,
    type?: ActivityType,
    withTotal = false,
  ): Promise<{ items: ActivityItemDto[]; total: number }> {
    // Para paginar dos fuentes ordenadas basta con traer page*limit de cada una
    const window = Math.min(page * limit, ActivityService.MAX_WINDOW);
    const wantOccupancies = type !== 'reservation';
    const wantReservations = !type || type === 'reservation';

    const occQb = this.occupancyRepository
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.space', 's')
      .leftJoinAndSelect('o.reservation', 'r')
      .where('s.parkingLotId = :parkingLotId', { parkingLotId });
    if (type === 'check_in') occQb.andWhere('o.checkOutTime IS NULL');
    if (type === 'check_out') occQb.andWhere('o.checkOutTime IS NOT NULL');

    // Las reservas COMPLETED ya están representadas por su ocupación
    const resQb = this.reservationRepository
      .createQueryBuilder('res')
      .innerJoinAndSelect('res.space', 'rs')
      .where('rs.parkingLotId = :parkingLotId', { parkingLotId })
      .andWhere('res.status != :completed', { completed: ReservationStatus.COMPLETED });

    const [occupancies, reservations, occTotal, resTotal] = await Promise.all([
      wantOccupancies
        ? occQb
            .clone()
            .orderBy('COALESCE(o.check_out_time, o.check_in_time)', 'DESC')
            .limit(window)
            .getMany()
        : Promise.resolve([] as Occupancy[]),
      wantReservations
        ? resQb.clone().orderBy('res.createdAt', 'DESC').limit(window).getMany()
        : Promise.resolve([] as Reservation[]),
      withTotal && wantOccupancies ? occQb.getCount() : Promise.resolve(0),
      withTotal && wantReservations ? resQb.getCount() : Promise.resolve(0),
    ]);

    const now = new Date();
    const occupancyItems = await this.mapOccupancies(occupancies, parkingLotId, now);
    const reservationItems = reservations.map((r) => this.mapReservation(r));

    const start = (page - 1) * limit;
    const items = [...occupancyItems, ...reservationItems]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(start, start + limit);

    return { items, total: occTotal + resTotal };
  }

  private async mapOccupancies(
    occupancies: Occupancy[],
    parkingLotId: string,
    now: Date,
  ): Promise<ActivityItemDto[]> {
    const rateCache = new Map<VehicleType, number | null>();

    const estimate = async (occ: Occupancy): Promise<number | null> => {
      if (!rateCache.has(occ.vehicleType)) {
        const rate = await this.ratesService.findApplicableRate(parkingLotId, occ.vehicleType, now);
        rateCache.set(occ.vehicleType, rate ? Number(rate.pricePerHour) : null);
      }
      const pricePerHour = rateCache.get(occ.vehicleType);
      if (pricePerHour == null) return null;
      // Misma regla que el check-out: horas redondeadas hacia arriba, mínimo 1
      const hours = Math.ceil((now.getTime() - new Date(occ.checkInTime).getTime()) / 3_600_000);
      return pricePerHour * Math.max(1, hours);
    };

    const items: ActivityItemDto[] = [];
    for (const occ of occupancies) {
      const isOpen = !occ.checkOutTime;
      const totalAmount = isOpen
        ? await estimate(occ)
        : occ.totalAmount != null
          ? Number(occ.totalAmount)
          : null;

      items.push({
        id: `${isOpen ? 'check_in' : 'check_out'}:${occ.id}`,
        type: isOpen ? 'check_in' : 'check_out',
        sourceId: occ.id,
        occurredAt: occ.checkOutTime ?? occ.checkInTime,
        vehiclePlate: (occ.vehiclePlate || occ.reservation?.vehiclePlate || 'Desconocida').toUpperCase(),
        vehicleType: occ.vehicleType,
        spaceNumber: occ.space?.spaceNumber,
        checkInTime: occ.checkInTime,
        checkOutTime: occ.checkOutTime ?? null,
        totalAmount,
        isEstimated: isOpen,
        entryMethod: occ.checkedInViaQr ? 'qr' : 'manual',
        exitMethod: isOpen ? null : occ.checkedOutViaQr ? 'qr' : 'manual',
        hasReservation: !!occ.reservationId,
      });
    }
    return items;
  }

  private mapReservation(r: Reservation): ActivityItemDto {
    return {
      id: `reservation:${r.id}`,
      type: 'reservation',
      sourceId: r.id,
      occurredAt: r.createdAt,
      vehiclePlate: (r.vehiclePlate || 'Desconocida').toUpperCase(),
      vehicleType: r.vehicleType,
      spaceNumber: r.space?.spaceNumber,
      checkInTime: r.startTime,
      checkOutTime: r.endTime,
      totalAmount: r.totalAmount != null ? Number(r.totalAmount) : null,
      isEstimated: false,
      entryMethod: 'reservation',
      exitMethod: null,
      hasReservation: true,
      reservationStatus: r.status,
    };
  }

  /** Owner: dueño del estacionamiento. Employee: asignado y activo. Admin: todo. */
  private async assertCanAccess(parkingLotId: string, user: ActivityRequester): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    if (user.role === UserRole.PARKING_OWNER) {
      const lot = await this.parkingLotRepository.findOne({
        where: { id: parkingLotId, owner: { userId: user.id } },
        select: { id: true },
      });
      if (lot) return;
    }

    if (user.role === UserRole.PARKING_EMPLOYEE) {
      const employee = await this.parkingEmployeeRepository.findOne({
        where: { userId: user.id, parkingLotId, isActive: true },
        select: { id: true },
      });
      if (employee) return;
    }

    throw new ForbiddenException('No tienes acceso a la actividad de este estacionamiento');
  }
}
