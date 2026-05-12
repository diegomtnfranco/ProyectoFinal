import { Test, TestingModule } from '@nestjs/testing';
import { ParkingLotsService } from './parking-lots.service';

describe('ParkingLotsService', () => {
  let service: ParkingLotsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingLotsService],
    }).compile();

    service = module.get<ParkingLotsService>(ParkingLotsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
