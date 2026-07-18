import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';

describe('OccupancyController', () => {
  let controller: OccupancyController;
  let occupancyService: {
    checkIn: jest.Mock;
    checkOut: jest.Mock;
    getActiveOccupancies: jest.Mock;
    getSpaceHistory: jest.Mock;
    anonymousCheckIn: jest.Mock;
    anonymousCheckOut: jest.Mock;
  };

  beforeEach(() => {
    occupancyService = {
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      getActiveOccupancies: jest.fn(),
      getSpaceHistory: jest.fn(),
      anonymousCheckIn: jest.fn(),
      anonymousCheckOut: jest.fn(),
    };

    controller = new OccupancyController(occupancyService as unknown as OccupancyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate check-in requests to the occupancy service', async () => {
    const checkInDto = { spaceId: 'space-1', vehiclePlate: 'ABC123' };
    const user = { id: 'user-1', role: 'PARKING_OWNER' };
    const expectedResponse = { id: 'occupancy-1' };
    occupancyService.checkIn.mockResolvedValue(expectedResponse);

    const response = await controller.checkIn(checkInDto as any, user as any);

    expect(occupancyService.checkIn).toHaveBeenCalledWith(checkInDto, user.id, user.role);
    expect(response).toEqual(expectedResponse);
  });

  it('should delegate check-out requests to the occupancy service', async () => {
    const checkOutDto = { spaceId: 'space-1' };
    const user = { id: 'user-1', role: 'PARKING_EMPLOYEE' };
    const expectedResponse = { success: true };
    occupancyService.checkOut.mockResolvedValue(expectedResponse);

    const response = await controller.checkOut(checkOutDto as any, user as any);

    expect(occupancyService.checkOut).toHaveBeenCalledWith(checkOutDto, user.id, user.role);
    expect(response).toEqual(expectedResponse);
  });

  it('should delegate active occupancy lookup and space history to the occupancy service', async () => {
    const expectedActive = [{ id: 'occ-1' }];
    const expectedHistory = [{ id: 'occ-2' }];
    occupancyService.getActiveOccupancies.mockResolvedValue(expectedActive);
    occupancyService.getSpaceHistory.mockResolvedValue(expectedHistory);

    const activeResponse = await controller.getActiveOccupancies('parking-lot-1', { id: 'user-1', role: 'PARKING_OWNER' } as any);
    const historyResponse = await controller.getSpaceHistory('space-1');

    expect(occupancyService.getActiveOccupancies).toHaveBeenCalledWith('parking-lot-1', 'user-1', 'PARKING_OWNER');
    expect(activeResponse).toEqual(expectedActive);
    expect(occupancyService.getSpaceHistory).toHaveBeenCalledWith('space-1');
    expect(historyResponse).toEqual(expectedHistory);
  });

  it('should delegate anonymous check-in/out requests', async () => {
    const anonymousCheckInDto = { token: 'token-1', vehiclePlate: 'ABC123' };
    const anonymousCheckOutDto = { token: 'token-2', vehiclePlate: 'ABC123' };
    occupancyService.anonymousCheckIn.mockResolvedValue({ success: true });
    occupancyService.anonymousCheckOut.mockResolvedValue({ success: true });

    await controller.anonymousCheckIn(anonymousCheckInDto as any);
    await controller.anonymousCheckOut(anonymousCheckOutDto as any);

    expect(occupancyService.anonymousCheckIn).toHaveBeenCalledWith(anonymousCheckInDto);
    expect(occupancyService.anonymousCheckOut).toHaveBeenCalledWith(anonymousCheckOutDto);
  });
});
