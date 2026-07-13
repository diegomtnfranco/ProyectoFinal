import { ParkingEmployeesService } from './parking-employees.service';

describe('ParkingEmployeesService', () => {
  let service: ParkingEmployeesService;
  let employeeRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; count: jest.Mock; find: jest.Mock };
  let userRepository: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let parkingLotRepository: { findOne: jest.Mock };
  let spaceRepository: { find: jest.Mock };
  let parkingOwnerRepository: { findOne: jest.Mock };

  beforeEach(() => {
    employeeRepository = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), count: jest.fn(), find: jest.fn() };
    userRepository = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
    parkingLotRepository = { findOne: jest.fn() };
    spaceRepository = { find: jest.fn() };
    parkingOwnerRepository = { findOne: jest.fn() };

    service = new ParkingEmployeesService(employeeRepository as any, userRepository as any, parkingLotRepository as any, spaceRepository as any, parkingOwnerRepository as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creation when parking lot does not belong to owner', async () => {
    parkingLotRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ parkingLotId: 'lot-1', email: 'e@test.com', password: '123456', name: 'John' } as any, 'owner-1')).rejects.toThrow();
  });
});
