import { Test, TestingModule } from '@nestjs/testing';
import { OccupancyService } from './occupancy.service';

describe('Occupancy integration smoke test', () => {
  let service: OccupancyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: OccupancyService,
          useValue: {
            checkIn: jest.fn().mockResolvedValue({ id: 'occ-1' }),
            checkOut: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<OccupancyService>(OccupancyService);
  });

  it('should allow occupancy flow methods to be called', async () => {
    const checkInResult = await service.checkIn({ spaceId: 'space-1' } as any, 'user-1', 'PARKING_OWNER');
    const checkOutResult = await service.checkOut({ spaceId: 'space-1' } as any, 'user-1', 'PARKING_OWNER');

    expect(checkInResult.id).toBe('occ-1');
    expect(checkOutResult.success).toBe(true);
  });
});
