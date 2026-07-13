import { ConflictException, NotFoundException } from '@nestjs/common';
import { ParkingOwnersService } from './parking-owners.service';

describe('ParkingOwnersService', () => {
  let service: ParkingOwnersService;
  let parkingOwnerRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock; delete: jest.Mock; find: jest.Mock };
  let userRepository: { findOne: jest.Mock };

  beforeEach(() => {
    parkingOwnerRepository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), find: jest.fn() };
    userRepository = { findOne: jest.fn() };
    service = new ParkingOwnersService(parkingOwnerRepository as any, userRepository as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creation when user does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ userId: 'user-1', cuit: '20-12345678-9' } as any)).rejects.toThrow(NotFoundException);
  });

  it('should reject duplicate CUIT', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'user-1' });
    parkingOwnerRepository.findOne.mockResolvedValueOnce({ id: 'owner-1' });

    await expect(service.create({ userId: 'user-1', cuit: '20-12345678-9' } as any)).rejects.toThrow(ConflictException);
  });
});
