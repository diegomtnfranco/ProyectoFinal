import { Test, TestingModule } from '@nestjs/testing';
import { OccupancyService } from './occupancy.service';

describe('OccupancyService', () => {
  let service: OccupancyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OccupancyService],
    }).compile();

    service = module.get<OccupancyService>(OccupancyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
