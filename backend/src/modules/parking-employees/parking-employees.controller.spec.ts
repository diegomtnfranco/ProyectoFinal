import { ParkingEmployeesController } from './parking-employees.controller';

describe('ParkingEmployeesController', () => {
  let controller: ParkingEmployeesController;
  let parkingEmployeesService: { create: jest.Mock; findByParkingLot: jest.Mock; findOne: jest.Mock; findByUserId: jest.Mock; getMyParkingLot: jest.Mock; update: jest.Mock; remove: jest.Mock };

  beforeEach(() => {
    parkingEmployeesService = {
      create: jest.fn(),
      findByParkingLot: jest.fn(),
      findOne: jest.fn(),
      findByUserId: jest.fn(),
      getMyParkingLot: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new ParkingEmployeesController(parkingEmployeesService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate employee lookup to the service', async () => {
    parkingEmployeesService.findOne.mockResolvedValue({ id: 'employee-1' });

    const result = await controller.findOne('employee-1');

    expect(parkingEmployeesService.findOne).toHaveBeenCalledWith('employee-1');
    expect(result).toEqual({ id: 'employee-1' });
  });
});
