import { ForbiddenException } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { SpaceStatus } from '../spaces/entities/space.entity';
import { UserRole } from '../users/entities/user.entity';

describe('OccupancyService', () => {
  let service: OccupancyService;
  let occupancyRepository: { create: jest.Mock; find: jest.Mock };
  let spaceRepository: { find: jest.Mock };
  let reservationRepository: unknown;
  let ratesService: { findApplicableRate: jest.Mock };
  let dataSource: { createQueryRunner: jest.Mock };
  let websocketGateway: { emitOccupancyUpdate: jest.Mock; emitSpaceUpdate: jest.Mock; emitParkingAvailability: jest.Mock };
  let parkingLotsService: { validateQRToken: jest.Mock };

  beforeEach(() => {
    occupancyRepository = { create: jest.fn(), find: jest.fn() };
    spaceRepository = { find: jest.fn() };
    reservationRepository = {};
    ratesService = { findApplicableRate: jest.fn() };
    dataSource = { createQueryRunner: jest.fn() };
    websocketGateway = {
      emitOccupancyUpdate: jest.fn(),
      emitSpaceUpdate: jest.fn(),
      emitParkingAvailability: jest.fn(),
    };
    parkingLotsService = { validateQRToken: jest.fn() };

    service = new OccupancyService(
      occupancyRepository as any,
      spaceRepository as any,
      reservationRepository as any,
      ratesService as any,
      dataSource as any,
      websocketGateway as any,
      parkingLotsService as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject check-in for unauthorized roles', async () => {
    await expect(service.checkIn({ spaceId: 'space-1' } as any, 'user-1', 'CLIENT')).rejects.toThrow(ForbiddenException);
  });

  it('should create an occupancy and emit websocket updates on successful check-in', async () => {
    const space = {
      id: 'space-1',
      parkingLotId: 'lot-1',
      spaceNumber: '001',
      status: SpaceStatus.AVAILABLE,
      occupiedSince: null,
      occupiedByVehiclePlate: null,
      occupiedByVehicleType: null,
      isReserved: false,
      reservedUntil: null,
    };
    const occupancy = { id: 'occ-1', spaceId: 'space-1' };
    const manager = {
      findOne: jest.fn().mockResolvedValue(space),
      save: jest.fn().mockImplementation(async (entity: any) => entity),
    };
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager,
    };

    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    occupancyRepository.create.mockReturnValue(occupancy);

    const result = await service.checkIn(
      { spaceId: 'space-1', vehiclePlate: 'ABC123', vehicleType: 'car' } as any,
      'user-1',
      UserRole.PARKING_OWNER,
    );

    expect(result).toBe(occupancy);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(websocketGateway.emitSpaceUpdate).toHaveBeenCalledWith('lot-1', 'space-1', SpaceStatus.OCCUPIED);
  });

  it('should calculate the total amount and return a checkout response', async () => {
    const occupancy = {
      id: 'occ-1',
      spaceId: 'space-1',
      reservationId: null,
      vehiclePlate: 'ABC123',
      vehicleType: 'car',
      checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      checkOutTime: null,
      checkedInBy: 'user-1',
      checkedOutBy: null,
      totalAmount: null,
      isCompleted: false,
      isAnonymous: false,
      checkedInViaQr: false,
      checkedOutViaQr: false,
      createdAt: new Date(),
      updatedAt: null,
      space: {
        id: 'space-1',
        parkingLotId: 'lot-1',
        spaceNumber: '001',
        status: SpaceStatus.OCCUPIED,
        parkingLot: { id: 'lot-1' },
      },
      reservation: null,
    };
    const rate = { id: 'rate-1', vehicleType: 'car', pricePerHour: 20 };
    const manager = {
      findOne: jest.fn().mockResolvedValue(occupancy),
      save: jest.fn().mockImplementation(async (entity: any) => entity),
    };
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager,
    };

    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    ratesService.findApplicableRate.mockResolvedValue(rate);

    const result = await service.checkOut({ spaceId: 'space-1' } as any, 'user-1', UserRole.PARKING_EMPLOYEE);

    expect(result.occupancy.totalAmount).toBe(60);
    expect(result.rate.pricePerHour).toBe(20);
    expect(websocketGateway.emitParkingAvailability).toHaveBeenCalledWith('lot-1');
  });

  it('should map active occupancies for authorized users', async () => {
    occupancyRepository.find.mockResolvedValue([
      {
        id: 'occ-1',
        spaceId: 'space-1',
        space: { id: 'space-1', spaceNumber: '001', status: SpaceStatus.OCCUPIED },
        vehiclePlate: 'ABC123',
        vehicleType: 'car',
        checkInTime: new Date(),
        checkedInBy: 'user-1',
        totalAmount: 0,
        isCompleted: false,
        reservationId: null,
        reservation: null,
      },
    ]);

    const result = await service.getActiveOccupancies('lot-1', 'user-1', UserRole.PARKING_OWNER);

    expect(result).toHaveLength(1);
    expect(result[0].vehiclePlate).toBe('ABC123');
    expect(result[0].hasReservation).toBe(false);
  });
});
