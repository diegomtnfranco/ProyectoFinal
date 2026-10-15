import { BadRequestException } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { SpaceStatus } from '../spaces/entities/space.entity';
import { UserRole } from '../users/entities/user.entity';
import { NO_RATE_QR_MESSAGE } from '../rate-history/rate-history.constants';

/** Reglas de tarifas en ingresos/egresos (feature: historial de tarifas) */
describe('OccupancyService - reglas de tarifa', () => {
  const build = () => {
    const occupancyRepository = { create: jest.fn((x) => ({ id: 'occ-1', ...x })), find: jest.fn() };
    const ratesService = { findApplicableRate: jest.fn() };
    const websocketGateway = { emitOccupancyUpdate: jest.fn(), emitSpaceUpdate: jest.fn(), emitParkingAvailability: jest.fn() };
    const parkingLotsService = { validateQRToken: jest.fn().mockResolvedValue({ id: 'lot-1', name: 'P', address: 'A' }) };
    const rateHistory = { snapshotForOccupancy: jest.fn(), findSnapshot: jest.fn().mockResolvedValue(null) };
    const manager = { findOne: jest.fn(), save: jest.fn(async (e: any) => e), getRepository: jest.fn() };
    const queryRunner = {
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(), release: jest.fn(), manager,
    };
    const dataSource = { createQueryRunner: jest.fn(() => queryRunner) };
    const service = new OccupancyService(
      occupancyRepository as any, {} as any, {} as any, ratesService as any, dataSource as any,
      websocketGateway as any, parkingLotsService as any, rateHistory as any,
    );
    return { service, ratesService, rateHistory, manager, queryRunner };
  };

  const space = () => ({ id: 'space-1', parkingLotId: 'lot-1', spaceNumber: '001', status: SpaceStatus.AVAILABLE });

  it('rechaza el ingreso manual si no hay tarifa para el tipo de vehículo', async () => {
    const { service, ratesService, manager, queryRunner } = build();
    manager.findOne.mockResolvedValue(space());
    ratesService.findApplicableRate.mockResolvedValue(null);

    const promise = service.checkIn({ spaceId: 'space-1', vehiclePlate: 'AB123CD', vehicleType: 'van' } as any, 'u1', UserRole.PARKING_EMPLOYEE);
    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toThrow('No existen tarifas para el tipo de vehículo Furgón');
    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('congela la tarifa vigente al registrar un ingreso manual', async () => {
    const { service, ratesService, rateHistory, manager } = build();
    const rate = { id: 'rate-1', vehicleType: 'car', pricePerHour: '500.00' };
    manager.findOne.mockResolvedValue(space());
    ratesService.findApplicableRate.mockResolvedValue(rate);

    await service.checkIn({ spaceId: 'space-1', vehiclePlate: 'AB123CD', vehicleType: 'car' } as any, 'u1', UserRole.PARKING_OWNER);
    expect(rateHistory.snapshotForOccupancy).toHaveBeenCalledWith(manager, 'occ-1', rate);
  });

  it('rechaza el ingreso por QR sin tarifa con el mensaje para el conductor', async () => {
    const { service, ratesService } = build();
    ratesService.findApplicableRate.mockResolvedValue(null);

    await expect(
      service.anonymousCheckIn({ token: 't', vehiclePlate: 'AB123CD', vehicleType: 'car' } as any),
    ).rejects.toThrow(NO_RATE_QR_MESSAGE);
  });

  it('cobra el egreso con la tarifa congelada al ingreso aunque la tarifa haya cambiado', async () => {
    const { service, ratesService, rateHistory, manager } = build();
    const checkInTime = new Date(Date.now() - 2 * 60 * 60 * 1000 + 60_000); // 1h59m → 2 h
    manager.findOne.mockResolvedValue({
      id: 'occ-1', spaceId: 'space-1', vehicleType: 'car', vehiclePlate: 'AB123CD', checkInTime,
      createdAt: new Date(), updatedAt: new Date(),
      space: { ...space(), status: SpaceStatus.OCCUPIED, parkingLot: { id: 'lot-1' } },
    });
    rateHistory.findSnapshot.mockResolvedValue({ rateId: 'rate-old', vehicleType: 'car', pricePerHour: '300.00' });
    ratesService.findApplicableRate.mockResolvedValue({ id: 'rate-new', vehicleType: 'car', pricePerHour: 900 });

    const result = await service.checkOut({ spaceId: 'space-1' } as any, 'u1', UserRole.PARKING_EMPLOYEE);
    expect(result.occupancy.totalAmount).toBe(600);
    expect(result.rate).toMatchObject({ id: 'rate-old', pricePerHour: 300 });
    expect(ratesService.findApplicableRate).not.toHaveBeenCalled();
  });

  it('sin tarifa congelada (ocupaciones viejas) cobra con la tarifa vigente', async () => {
    const { service, ratesService, manager } = build();
    manager.findOne.mockResolvedValue({
      id: 'occ-2', spaceId: 'space-1', vehicleType: 'car', checkInTime: new Date(Date.now() - 30 * 60_000),
      createdAt: new Date(), updatedAt: new Date(),
      space: { ...space(), status: SpaceStatus.OCCUPIED, parkingLot: { id: 'lot-1' } },
    });
    ratesService.findApplicableRate.mockResolvedValue({ id: 'rate-new', vehicleType: 'car', pricePerHour: 900 });

    const result = await service.checkOut({ spaceId: 'space-1' } as any, 'u1', UserRole.PARKING_OWNER);
    expect(result.occupancy.totalAmount).toBe(900);
  });
});
