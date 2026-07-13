import { ParkingOwnersController } from './parking-owners.controller';

describe('ParkingOwnersController', () => {
  let controller: ParkingOwnersController;
  let parkingOwnersService: { create: jest.Mock; findAll: jest.Mock; getPendingApproval: jest.Mock; findOne: jest.Mock; update: jest.Mock; approveOwner: jest.Mock; approve: jest.Mock; remove: jest.Mock };

  beforeEach(() => {
    parkingOwnersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      getPendingApproval: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      approveOwner: jest.fn(),
      approve: jest.fn(),
      remove: jest.fn(),
    };

    controller = new ParkingOwnersController(parkingOwnersService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate approval to the service', async () => {
    parkingOwnersService.approveOwner.mockResolvedValue({ id: 'owner-1' });

    const result = await controller.approveOwner('owner-1');

    expect(parkingOwnersService.approveOwner).toHaveBeenCalledWith('owner-1');
    expect(result).toEqual({ id: 'owner-1' });
  });
});
