import { RatesController } from './rates.controller';

describe('RatesController', () => {
  let controller: RatesController;
  let ratesService: { create: jest.Mock; findAll: jest.Mock; findByParkingLot: jest.Mock; findByVehicleType: jest.Mock; findApplicableRate: jest.Mock; findOne: jest.Mock; update: jest.Mock; remove: jest.Mock; hardRemove: jest.Mock };

  beforeEach(() => {
    ratesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByParkingLot: jest.fn(),
      findByVehicleType: jest.fn(),
      findApplicableRate: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      hardRemove: jest.fn(),
    };

    controller = new RatesController(ratesService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate applicable rate lookup to the service', async () => {
    ratesService.findApplicableRate.mockResolvedValue({ id: 'rate-1' });

    const result = await controller.findApplicableRate('lot-1', 'car' as any, '2024-01-01T00:00:00.000Z');

    expect(ratesService.findApplicableRate).toHaveBeenCalledWith('lot-1', 'car', expect.any(Date));
    expect(result).toEqual({ id: 'rate-1' });
  });
});
