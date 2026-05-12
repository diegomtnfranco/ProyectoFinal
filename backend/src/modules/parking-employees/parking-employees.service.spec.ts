import { Test, TestingModule } from '@nestjs/testing';
import { ParkingEmployeesService } from './parking-employees.service';

describe('ParkingEmployeesService', () => {
  let service: ParkingEmployeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingEmployeesService],
    }).compile();

    service = module.get<ParkingEmployeesService>(ParkingEmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
