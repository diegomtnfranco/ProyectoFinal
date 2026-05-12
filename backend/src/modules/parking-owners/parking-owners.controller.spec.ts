import { Test, TestingModule } from '@nestjs/testing';
import { ParkingOwnersController } from './parking-owners.controller';
import { ParkingOwnersService } from './parking-owners.service';

describe('ParkingOwnersController', () => {
  let controller: ParkingOwnersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingOwnersController],
      providers: [ParkingOwnersService],
    }).compile();

    controller = module.get<ParkingOwnersController>(ParkingOwnersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
