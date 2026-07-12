import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RatesService } from './rates.service';
import { UserRole } from '../users/entities/user.entity';

describe('RatesService', () => {
  let service: RatesService;
  let rateRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock; update: jest.Mock; delete: jest.Mock; createQueryBuilder: jest.Mock };
  let parkingLotRepository: { findOne: jest.Mock };

  beforeEach(() => {
    rateRepository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn(), update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn() };
    parkingLotRepository = { findOne: jest.fn() };
    service = new RatesService(rateRepository as any, parkingLotRepository as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject rate creation when parking lot does not exist', async () => {
    parkingLotRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ parkingLotId: 'lot-1', vehicleType: 'car', pricePerHour: 10, rateType: 'hourly' } as any, 'user-1', UserRole.PARKING_OWNER)).rejects.toThrow(NotFoundException);
  });

  it('should reject duplicate active rate for same vehicle type', async () => {
    parkingLotRepository.findOne.mockResolvedValue({ id: 'lot-1', owner: { userId: 'user-1' } });
    rateRepository.findOne.mockResolvedValue({ id: 'rate-1' });

    await expect(service.create({ parkingLotId: 'lot-1', vehicleType: 'car', pricePerHour: 10, rateType: 'hourly' } as any, 'user-1', UserRole.PARKING_OWNER)).rejects.toThrow(ConflictException);
  });
});
