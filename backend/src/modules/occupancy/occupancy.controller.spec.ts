import { Test, TestingModule } from '@nestjs/testing';
import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';

describe('OccupancyController', () => {
  let controller: OccupancyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OccupancyController],
      providers: [OccupancyService],
    }).compile();

    controller = module.get<OccupancyController>(OccupancyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
