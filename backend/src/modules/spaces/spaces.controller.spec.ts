import { SpacesController } from './spaces.controller';

describe('SpacesController', () => {
  let controller: SpacesController;
  let spacesService: { create: jest.Mock; findAll: jest.Mock; findByParkingLot: jest.Mock; findAvailable: jest.Mock; findOne: jest.Mock; update: jest.Mock; updateStatus: jest.Mock; remove: jest.Mock; reactivateSpace: jest.Mock; findAllSpaces: jest.Mock };

  beforeEach(() => {
    spacesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByParkingLot: jest.fn(),
      findAvailable: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      reactivateSpace: jest.fn(),
      findAllSpaces: jest.fn(),
    };

    controller = new SpacesController(spacesService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service with the current user context', async () => {
    spacesService.create.mockResolvedValue({ id: 'space-1' });

    const result = await controller.create({ parkingLotId: 'lot-1' } as any, { id: 'user-1', role: 'admin' });

    expect(spacesService.create).toHaveBeenCalledWith({ parkingLotId: 'lot-1' }, 'user-1', 'admin');
    expect(result).toEqual({ id: 'space-1' });
  });
});
