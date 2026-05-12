import { Test, TestingModule } from '@nestjs/testing';
import { ParkingOwnersService } from './parking-owners.service';

describe('ParkingOwnersService', () => {
  let service: ParkingOwnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingOwnersService],
    }).compile();

    service = module.get<ParkingOwnersService>(ParkingOwnersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
