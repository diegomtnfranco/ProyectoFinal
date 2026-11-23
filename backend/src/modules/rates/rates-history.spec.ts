import { ForbiddenException } from '@nestjs/common';
import { RatesService } from './rates.service';
import { UserRole } from '../users/entities/user.entity';
import { RateChangeAction } from '../rate-history/entities/rate-change-log.entity';

/** Eliminación por el dueño + registro de cambios en el historial */
describe('RatesService - historial de tarifas', () => {
  const rate = { id: 'rate-1', parkingLotId: 'lot-1', vehicleType: 'car', pricePerHour: '500.00', isActive: true };

  const build = () => {
    const rateRepository = {
      findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn(async (x) => ({ id: 'rate-9', ...x })),
      update: jest.fn(), delete: jest.fn(),
    };
    const parkingLotRepository = { findOne: jest.fn() };
    const rateHistory = { recordChange: jest.fn() };
    const service = new RatesService(rateRepository as any, parkingLotRepository as any, rateHistory as any);
    return { service, rateRepository, parkingLotRepository, rateHistory };
  };

  it('el dueño puede eliminar su tarifa (se valida por owner.userId) y queda registrado', async () => {
    const { service, rateRepository, parkingLotRepository, rateHistory } = build();
    rateRepository.findOne.mockResolvedValue(rate);
    parkingLotRepository.findOne.mockResolvedValue({ id: 'lot-1' });

    await service.remove('rate-1', 'user-owner', UserRole.PARKING_OWNER);

    expect(parkingLotRepository.findOne).toHaveBeenCalledWith({ where: { id: 'lot-1', owner: { userId: 'user-owner' } } });
    expect(rateRepository.update).toHaveBeenCalledWith('rate-1', { isActive: false });
    expect(rateHistory.recordChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: RateChangeAction.DELETED, previousPricePerHour: '500.00', newPricePerHour: null, userId: 'user-owner' }),
    );
  });

  it('un dueño no puede eliminar tarifas de otro estacionamiento', async () => {
    const { service, rateRepository, parkingLotRepository, rateHistory } = build();
    rateRepository.findOne.mockResolvedValue(rate);
    parkingLotRepository.findOne.mockResolvedValue(null);

    await expect(service.remove('rate-1', 'otro', UserRole.PARKING_OWNER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(rateRepository.update).not.toHaveBeenCalled();
    expect(rateHistory.recordChange).not.toHaveBeenCalled();
  });

  it('registra la tarifa anterior y la nueva al editar', async () => {
    const { service, rateRepository, parkingLotRepository, rateHistory } = build();
    rateRepository.findOne
      .mockResolvedValueOnce(rate)
      .mockResolvedValueOnce({ ...rate, pricePerHour: '800.00' });
    parkingLotRepository.findOne.mockResolvedValue({ id: 'lot-1' });

    await service.update('rate-1', { pricePerHour: 800 } as any, 'user-owner', UserRole.PARKING_OWNER);

    expect(rateHistory.recordChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: RateChangeAction.UPDATED, previousPricePerHour: '500.00', newPricePerHour: '800.00' }),
    );
  });

  it('registra el alta de una tarifa nueva', async () => {
    const { service, rateRepository, parkingLotRepository, rateHistory } = build();
    parkingLotRepository.findOne.mockResolvedValue({ id: 'lot-1', owner: { userId: 'user-owner' } });
    rateRepository.findOne.mockResolvedValue(null);

    await service.create({ parkingLotId: 'lot-1', vehicleType: 'car', pricePerHour: 700, rateType: 'hourly' } as any, 'user-owner', UserRole.PARKING_OWNER);

    expect(rateHistory.recordChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: RateChangeAction.CREATED, previousPricePerHour: null, newPricePerHour: 700 }),
    );
  });
});
