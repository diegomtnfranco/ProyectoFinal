import { Test, TestingModule } from '@nestjs/testing';
import { ClientProfilesController } from './client-profiles.controller';
import { ClientProfilesService } from './client-profiles.service';

describe('ClientProfilesController', () => {
  let controller: ClientProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientProfilesController],
      providers: [ClientProfilesService],
    }).compile();

    controller = module.get<ClientProfilesController>(ClientProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
