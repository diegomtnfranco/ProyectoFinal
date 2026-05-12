import { Test, TestingModule } from '@nestjs/testing';
import { ClientProfilesService } from './client-profiles.service';

describe('ClientProfilesService', () => {
  let service: ClientProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientProfilesService],
    }).compile();

    service = module.get<ClientProfilesService>(ClientProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
