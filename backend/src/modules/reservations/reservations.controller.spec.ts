import { ReservationsController } from './reservations.controller';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let reservationsService: { create: jest.Mock; findAll: jest.Mock; findMyReservations: jest.Mock; findByParkingLot: jest.Mock; confirmReservation: jest.Mock; cancelByClient: jest.Mock; cancelByParking: jest.Mock; findOne: jest.Mock; update: jest.Mock; remove: jest.Mock; changeSpace: jest.Mock };

  beforeEach(() => {
    reservationsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findMyReservations: jest.fn(),
      findByParkingLot: jest.fn(),
      confirmReservation: jest.fn(),
      cancelByClient: jest.fn(),
      cancelByParking: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      changeSpace: jest.fn(),
    };

    controller = new ReservationsController(reservationsService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', async () => {
    const createDto = { parkingLotId: 'lot-1' };
    reservationsService.create.mockResolvedValue({ id: 'res-1' });

    const result = await controller.create(createDto as any, 'user-1');

    expect(reservationsService.create).toHaveBeenCalledWith(createDto, 'user-1');
    expect(result).toEqual({ id: 'res-1' });
  });
});
