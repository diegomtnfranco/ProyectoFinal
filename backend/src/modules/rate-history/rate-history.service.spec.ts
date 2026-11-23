import { RateHistoryService } from './rate-history.service';
import { RateChangeAction } from './entities/rate-change-log.entity';

describe('RateHistoryService', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const changeLogRepository = { create: jest.fn((x) => x), save: jest.fn(async (x) => x), find: jest.fn(), count: jest.fn() };
    const repos = {
      changeLogRepository,
      snapshotRepository: { findOne: jest.fn(), find: jest.fn() },
      userRepository: { findOne: jest.fn().mockResolvedValue({ id: 'u1', email: 'duenio@mail.com' }) },
      ownerRepository: { findOne: jest.fn().mockResolvedValue({ id: 'o1', name: 'Martín Zamora' }) },
      employeeRepository: { findOne: jest.fn().mockResolvedValue(null) },
      ...overrides,
    };
    const service = new RateHistoryService(
      repos.changeLogRepository as any, repos.snapshotRepository as any, repos.userRepository as any,
      repos.ownerRepository as any, repos.employeeRepository as any,
    );
    return { service, repos };
  };

  it('guarda nombre y email del usuario que hizo el cambio', async () => {
    const { service, repos } = build();
    await service.recordChange({
      action: RateChangeAction.UPDATED,
      rate: { id: 'r1', parkingLotId: 'lot-1', vehicleType: 'car' as any },
      previousPricePerHour: '500.00',
      newPricePerHour: 800,
      userId: 'u1',
    });
    expect(repos.changeLogRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        previousPricePerHour: 500, newPricePerHour: 800,
        changedByName: 'Martín Zamora', changedByEmail: 'duenio@mail.com',
      }),
    );
  });

  it('no lanza si falla el guardado del historial', async () => {
    const { service, repos } = build();
    repos.changeLogRepository.save.mockRejectedValue(new Error('db caída'));
    await expect(
      service.recordChange({
        action: RateChangeAction.CREATED,
        rate: { id: 'r1', parkingLotId: 'lot-1', vehicleType: 'car' as any },
        previousPricePerHour: null, newPricePerHour: 100, userId: 'u1',
      }),
    ).resolves.toBeUndefined();
  });
});
