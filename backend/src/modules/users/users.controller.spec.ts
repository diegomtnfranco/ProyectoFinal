import { UsersController } from './users.controller';


describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { create: jest.Mock; findAll: jest.Mock; findOne: jest.Mock; findByEmail: jest.Mock; update: jest.Mock; remove: jest.Mock; activateUser: jest.Mock; deactivateUser: jest.Mock; updateAvatar: jest.Mock };
  let cloudinaryService: { deleteImage: jest.Mock };
  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
      updateAvatar: jest.fn(),
    };

    cloudinaryService = {
      deleteImage: jest.fn(),
    };
        controller = new UsersController(usersService as any, cloudinaryService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', async () => {
    usersService.create.mockResolvedValue({ id: 'user-1' });

    const result = await controller.create({ email: 'a@test.com' } as any);

    expect(usersService.create).toHaveBeenCalledWith({ email: 'a@test.com' });
    expect(result).toEqual({ id: 'user-1' });
  });
});
