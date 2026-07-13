import { ParkingLotsController } from './parking-lots.controller';

describe('ParkingLotsController', () => {
  let controller: ParkingLotsController;
  let parkingLotsService: { create: jest.Mock; findAllPaginated: jest.Mock; findAll: jest.Mock; findNearby: jest.Mock; getOwnerParkingLot: jest.Mock; getEmployeeParkingLot: jest.Mock; findOne: jest.Mock; findByOwner: jest.Mock; getAvailability: jest.Mock; update: jest.Mock; remove: jest.Mock; toggleStatus: jest.Mock };
  let cloudinaryService: { uploadImage: jest.Mock };

  beforeEach(() => {
    parkingLotsService = {
      create: jest.fn(),
      findAllPaginated: jest.fn(),
      findAll: jest.fn(),
      findNearby: jest.fn(),
      getOwnerParkingLot: jest.fn(),
      getEmployeeParkingLot: jest.fn(),
      findOne: jest.fn(),
      findByOwner: jest.fn(),
      getAvailability: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toggleStatus: jest.fn(),
    };
    cloudinaryService = { uploadImage: jest.fn() };

    controller = new ParkingLotsController(parkingLotsService as any, cloudinaryService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate nearby lookup to the service', async () => {
    parkingLotsService.findNearby.mockResolvedValue([{ id: 'lot-1' }]);

    const result = await controller.findNearby(1, 2, '1000');

    expect(parkingLotsService.findNearby).toHaveBeenCalledWith(1, 2, 1000);
    expect(result).toEqual([{ id: 'lot-1' }]);
  });
});
