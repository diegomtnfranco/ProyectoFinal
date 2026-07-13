import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationStatus } from './entities/reservation.entity';
import { SpaceStatus } from '../spaces/entities/space.entity';
import { UserRole } from '../users/entities/user.entity';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationRepository: { find: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let spaceRepository: { find: jest.Mock; save: jest.Mock };
  let clientRepository: { findOne: jest.Mock };
  let parkingLotRepository: { findOne: jest.Mock };
  let ratesService: { findApplicableRate: jest.Mock };
  let notificationsService: { sendNewReservationNotification: jest.Mock; sendReservationConfirmedNotification: jest.Mock; sendSpaceChangedNotification: jest.Mock };
  let dataSource: { createQueryRunner: jest.Mock };
  let websocketGateway: { emitSpaceUpdate: jest.Mock; emitParkingAvailability: jest.Mock; emitNewReservation: jest.Mock };

  beforeEach(() => {
    reservationRepository = { find: jest.fn(), save: jest.fn(), findOne: jest.fn() };
    spaceRepository = { find: jest.fn(), save: jest.fn() };
    clientRepository = { findOne: jest.fn() };
    parkingLotRepository = { findOne: jest.fn() };
    ratesService = { findApplicableRate: jest.fn() };
    notificationsService = {
      sendNewReservationNotification: jest.fn(),
      sendReservationConfirmedNotification: jest.fn(),
      sendSpaceChangedNotification: jest.fn(),
    };
    dataSource = { createQueryRunner: jest.fn() };
    websocketGateway = { emitSpaceUpdate: jest.fn(), emitParkingAvailability: jest.fn(), emitNewReservation: jest.fn() };

    service = new ReservationsService(
      reservationRepository as any,
      spaceRepository as any,
      clientRepository as any,
      parkingLotRepository as any,
      ratesService as any,
      notificationsService as any,
      dataSource as any,
      websocketGateway as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject reservation creation when no client profile exists', async () => {
    clientRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ parkingLotId: 'lot-1', vehicleType: 'car', vehiclePlate: 'ABC123', startTime: '2099-01-01T10:00:00Z', endTime: '2099-01-01T12:00:00Z' } as any, 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('should reject reservation confirmation for unauthorized role', async () => {
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: { findOne: jest.fn().mockResolvedValue({ id: 'res-1', status: ReservationStatus.PENDING_CONFIRMATION, startTime: new Date(Date.now() + 3600000), space: { status: SpaceStatus.AVAILABLE } }) },
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    dataSource.createQueryRunner.mockReturnValue(queryRunner);

    await expect(service.confirmReservation('res-1', 'user-1', 'CLIENT' as UserRole)).rejects.toThrow(ForbiddenException);
  });
});
