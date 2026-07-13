import { ClientProfilesController } from './client-profiles.controller';

describe('ClientProfilesController', () => {
  let controller: ClientProfilesController;
  let clientsService: { create: jest.Mock; findAll: jest.Mock; findByUserId: jest.Mock; findOne: jest.Mock; update: jest.Mock; remove: jest.Mock };

  beforeEach(() => {
    clientsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByUserId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new ClientProfilesController(clientsService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate profile creation to the service', async () => {
    clientsService.create.mockResolvedValue({ id: 'profile-1' });

    const result = await controller.create({ userId: 'user-1' } as any);

    expect(clientsService.create).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result).toEqual({ id: 'profile-1' });
  });
});
