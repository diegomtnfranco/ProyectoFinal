import { ActivityService } from './activity.service';
import { UserRole } from '../users/entities/user.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { RateChangeAction } from '../rate-history/entities/rate-change-log.entity';

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
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

/** Tarjetas de cambio de tarifa en el feed + tarifa congelada en la estimación */
describe('ActivityService - cambios de tarifa', () => {
  const openOcc = {
    id: 'occ-open', vehiclePlate: 'AB123CD', vehicleType: VehicleType.CAR,
    checkInTime: minutesAgo(90), checkOutTime: null, totalAmount: null,
    checkedInViaQr: false, checkedOutViaQr: false, reservationId: null, space: { spaceNumber: 'A1' },
  };
  const log = {
    id: 'log-1', parkingLotId: LOT, rateId: 'rate-1', vehicleType: VehicleType.CAR,
    action: RateChangeAction.UPDATED, previousPricePerHour: '500.00', newPricePerHour: '900.00',
    changedByName: 'Martín', changedByEmail: 'martin@mail.com', createdAt: minutesAgo(10),
  };

  const build = () => {
    const rateHistory = {
      findChanges: jest.fn().mockResolvedValue([log]),
      countChanges: jest.fn().mockResolvedValue(1),
      findSnapshotPrices: jest.fn().mockResolvedValue(new Map([['occ-open', 500]])),
    };
    const ratesService = { findApplicableRate: jest.fn().mockResolvedValue({ pricePerHour: '900.00' }) };
    const service = new ActivityService(
      { createQueryBuilder: () => makeQb([openOcc]) } as any,
      { createQueryBuilder: () => makeQb([]) } as any,
      { findOne: jest.fn().mockResolvedValue({ id: LOT }) } as any,
      { findOne: jest.fn() } as any,
      ratesService as any,
      rateHistory as any,
    );
    return { service, rateHistory, ratesService };
  };

  it('incluye la tarjeta de cambio con tarifa anterior, nueva y usuario', async () => {
    const { service } = build();
    const items = await service.getRecent(LOT, owner, 3);
    const change = items.find((i) => i.type === 'rate_change')!;
    expect(change.rateChange).toEqual({
      action: 'updated', previousPricePerHour: 500, newPricePerHour: 900,
      changedByName: 'Martín', changedByEmail: 'martin@mail.com',
    });
    expect(change.vehicleType).toBe(VehicleType.CAR);
  });

  it('el vehículo que ingresó antes del cambio se estima con la tarifa anterior', async () => {
    const { service, ratesService } = build();
    const items = await service.getRecent(LOT, owner, 3);
    const open = items.find((i) => i.type === 'check_in')!;
    expect(open.totalAmount).toBe(1000); // 1h30 → 2 h × 500 (no 900)
    expect(ratesService.findApplicableRate).not.toHaveBeenCalled();
  });

  it('filtra solo cambios de tarifa', async () => {
    const { service } = build();
    const page = await service.findPaginated(LOT, owner, 1, 10, 'rate_change');
    expect(page.items.map((i) => i.type)).toEqual(['rate_change']);
    expect(page.total).toBe(1);
  });
});
