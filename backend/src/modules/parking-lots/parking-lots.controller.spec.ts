import { Test, TestingModule } from '@nestjs/testing';
import { ParkingLotsController } from './parking-lots.controller';
import { ParkingLotsService } from './parking-lots.service';
import { beforeEach, describe, it } from 'node:test';

describe('ParkingLotsController', () => {
  let controller: ParkingLotsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingLotsController],
      providers: [ParkingLotsService],
    }).compile();

    controller = module.get<ParkingLotsController>(ParkingLotsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
