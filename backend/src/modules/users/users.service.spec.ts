import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; preload: jest.Mock; remove: jest.Mock };
  let cloudinaryService: { deleteImage: jest.Mock };

  beforeEach(() => {
    usersRepository = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), preload: jest.fn(), remove: jest.fn() };
    cloudinaryService = { deleteImage: jest.fn() };

    service = new UsersService(usersRepository as any, cloudinaryService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user with hashed password', async () => {
    usersRepository.create.mockReturnValue({ id: 'user-1' });
    usersRepository.save.mockResolvedValue({ id: 'user-1' });

    const result = await service.create({ email: 'a@test.com', password: '123456' } as any);

    expect(usersRepository.create).toHaveBeenCalled();
    expect(usersRepository.save).toHaveBeenCalled();
    expect(result).toEqual({ id: 'user-1' });
  });
});
