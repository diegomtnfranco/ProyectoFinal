import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { SpaceStatus } from './entities/space.entity';
import { UserRole } from '../users/entities/user.entity';

describe('SpacesService', () => {
  let service: SpacesService;
  let spaceRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock; find: jest.Mock; createQueryBuilder: jest.Mock };
  let parkingLotRepository: { findOne: jest.Mock };
  let websocketGateway: { emitSpaceUpdate: jest.Mock };

  beforeEach(() => {
    spaceRepository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() };
    parkingLotRepository = { findOne: jest.fn() };
    websocketGateway = { emitSpaceUpdate: jest.fn() };

    service = new SpacesService(spaceRepository as any, parkingLotRepository as any, websocketGateway as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creation when parking lot is missing', async () => {
    parkingLotRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ parkingLotId: 'lot-1', spaceNumber: '001', allowedVehicleTypes: ['car'], allowsReservations: true } as any, 'user-1', UserRole.ADMIN)).rejects.toThrow(NotFoundException);
  });

  it('should reject update by employee when changing non-status fields', async () => {
    const existingSpace = { id: 'space-1', parkingLotId: 'lot-1', status: SpaceStatus.AVAILABLE };
    spaceRepository.findOne.mockResolvedValue(existingSpace);

    await expect(service.update('space-1', { spaceNumber: '002' } as any, 'user-1', UserRole.PARKING_EMPLOYEE)).rejects.toThrow(ForbiddenException);
  });
});
