import { ForbiddenException } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { UserRole } from '../users/entities/user.entity';
import { ReservationStatus } from '../reservations/entities/reservation.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';

const makeQb = (rows: any[], count = rows.length) => {
  const qb: any = {};
  ['innerJoinAndSelect', 'leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'limit'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
  );
  qb.clone = jest.fn().mockReturnValue(qb);
  qb.getMany = jest.fn().mockResolvedValue(rows);
  qb.getCount = jest.fn().mockResolvedValue(count);
  return qb;
};

const LOT = '11111111-1111-1111-1111-111111111111';
const owner = { id: 'owner-user', role: UserRole.PARKING_OWNER };
const employee = { id: 'emp-user', role: UserRole.PARKING_EMPLOYEE };

describe('ActivityService', () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

  const openOcc = {
    id: 'occ-open', vehiclePlate: 'ab123cd', vehicleType: VehicleType.CAR,
    checkInTime: hoursAgo(2.5), checkOutTime: null, totalAmount: null,
    checkedInViaQr: true, checkedOutViaQr: false, reservationId: null,
    space: { spaceNumber: 'A1' },
  };
  const closedOcc = {
    id: 'occ-closed', vehiclePlate: 'XYZ999', vehicleType: VehicleType.MOTORCYCLE,
    checkInTime: hoursAgo(5), checkOutTime: hoursAgo(1), totalAmount: '800.00',
    checkedInViaQr: false, checkedOutViaQr: true, reservationId: 'res-x',
    space: { spaceNumber: 'B2' },
  };
  const reservation = {
    id: 'res-1', vehiclePlate: 'qwe456', vehicleType: VehicleType.VAN,
    startTime: hoursAgo(-3), endTime: hoursAgo(-5), createdAt: hoursAgo(0.5),
    totalAmount: '1500.00', status: ReservationStatus.PENDING_CONFIRMATION,
    space: { spaceNumber: 'C3' },
  };

  let service: ActivityService;
  let parkingLotRepo: any;
  let employeeRepo: any;
  let ratesService: any;

  beforeEach(() => {
    parkingLotRepo = { findOne: jest.fn().mockResolvedValue({ id: LOT }) };
    employeeRepo = { findOne: jest.fn().mockResolvedValue({ id: 'e1' }) };
    ratesService = { findApplicableRate: jest.fn().mockResolvedValue({ pricePerHour: '1000.00' }) };
    service = new ActivityService(
      { createQueryBuilder: () => makeQb([closedOcc, openOcc]) } as any,
      { createQueryBuilder: () => makeQb([reservation]) } as any,
      parkingLotRepo,
      employeeRepo,
      ratesService,
    );
  });

  it('devuelve las 3 actividades más recientes ordenadas', async () => {
    const items = await service.getRecent(LOT, owner, 3);
    expect(items.map((i) => i.type)).toEqual(['reservation', 'check_out', 'check_in']);
  });

  it('estima la tarifa de un ingreso abierto (horas hacia arriba)', async () => {
    const items = await service.getRecent(LOT, owner, 3);
    const open = items.find((i) => i.type === 'check_in')!;
    expect(open.isEstimated).toBe(true);
    expect(open.totalAmount).toBe(3000); // 2.5h -> 3h * 1000
    expect(open.entryMethod).toBe('qr');
    expect(open.vehiclePlate).toBe('AB123CD');
  });

  it('usa el total real en egresos y el monto de la reserva', async () => {
    const items = await service.getRecent(LOT, owner, 3);
    const closed = items.find((i) => i.type === 'check_out')!;
    expect(closed.totalAmount).toBe(800);
    expect(closed.entryMethod).toBe('manual');
    expect(closed.exitMethod).toBe('qr');
    const res = items.find((i) => i.type === 'reservation')!;
    expect(res.totalAmount).toBe(1500);
    expect(res.entryMethod).toBe('reservation');
  });

  it('respeta el límite', async () => {
    expect(await service.getRecent(LOT, owner, 1)).toHaveLength(1);
  });

  it('pagina y calcula hasMore', async () => {
    const res = await service.findPaginated(LOT, owner, 1, 2);
    expect(res.items).toHaveLength(2);
    expect(res.total).toBe(3);
    expect(res.hasMore).toBe(true);
  });

  it('rechaza a un owner que no es dueño del estacionamiento', async () => {
    parkingLotRepo.findOne.mockResolvedValue(null);
    await expect(service.getRecent(LOT, owner)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza a un empleado no asignado y a un cliente', async () => {
    employeeRepo.findOne.mockResolvedValue(null);
    await expect(service.getRecent(LOT, employee)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getRecent(LOT, { id: 'c', role: UserRole.CLIENT })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
