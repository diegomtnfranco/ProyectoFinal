import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ParkingLotsService } from './parking-lots.service';
import { UserRole } from '../users/entities/user.entity';

describe('ParkingLotsService', () => {
  let service: ParkingLotsService;
  let parkingLotRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let parkingOwnerRepository: { findOne: jest.Mock };
  let rateRepository: unknown;
  let spaceRepository: { find: jest.Mock };
  let parkingEmployeeRepository: unknown;
  let cloudinaryService: unknown;
  let qrService: { generateQRForType: jest.Mock };

  beforeEach(() => {
    parkingLotRepository = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
    parkingOwnerRepository = { findOne: jest.fn() };
    rateRepository = {};
    spaceRepository = { find: jest.fn() };
    parkingEmployeeRepository = {};
    cloudinaryService = {};
    qrService = { generateQRForType: jest.fn() };

    service = new ParkingLotsService(
      parkingLotRepository as any,
      parkingOwnerRepository as any,
      rateRepository as any,
      spaceRepository as any,
      parkingEmployeeRepository as any,
      cloudinaryService as any,
      qrService as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject access to parking lots for unauthorized owner', async () => {
    parkingOwnerRepository.findOne.mockResolvedValue({ id: 'owner-1' });

    await expect(service.findByOwner('owner-2', 'user-1', UserRole.PARKING_OWNER)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw when parking lot is not found', async () => {
    parkingLotRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
