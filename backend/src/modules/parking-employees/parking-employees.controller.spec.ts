import { Test, TestingModule } from '@nestjs/testing';
import { ParkingEmployeesController } from './parking-employees.controller';
import { ParkingEmployeesService } from './parking-employees.service';

describe('ParkingEmployeesController', () => {
  let controller: ParkingEmployeesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingEmployeesController],
      providers: [ParkingEmployeesService],
    }).compile();

    controller = module.get<ParkingEmployeesController>(ParkingEmployeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
