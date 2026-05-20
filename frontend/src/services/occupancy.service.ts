import api from './api';

const occupancyService = {
  getOccupancyMetrics: async () => {
    const response = await api.get('/occupancy/metrics');
    return response.data;
  },
  checkIn: async (payload: { plateNumber: string; spaceId: string }) => {
    const response = await api.post('/occupancy/check-in', payload);
    return response.data;
  },
  checkOut: async (payload: { reservationId: string }) => {
    const response = await api.post('/occupancy/check-out', payload);
    return response.data;
  }
};

export default occupancyService;
