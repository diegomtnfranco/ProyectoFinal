import { ClientsService } from './client-profiles.service';

describe('ClientProfilesService', () => {
  let service: ClientsService;
  let clientsRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock; delete: jest.Mock };
  let userRepository: { findOne: jest.Mock };

  beforeEach(() => {
    clientsRepository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn(), delete: jest.fn() };
    userRepository = { findOne: jest.fn() };

    service = new ClientsService(clientsRepository as any, userRepository as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject creation when the user does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ userId: 'user-1' } as any)).rejects.toThrow();
  });
});
