import api from './api';
import type { Rate } from '../types/parking.types';

const rateService = {
  createRate: async (parkingLotId: string, payload: Partial<Rate>) => {
    const response = await api.post<Rate>(`/parking-lots/${parkingLotId}/rates`, payload);
    return response.data;
  },
  updateRate: async (parkingLotId: string, rateId: string, payload: Partial<Rate>) => {
    const response = await api.put<Rate>(`/parking-lots/${parkingLotId}/rates/${rateId}`, payload);
    return response.data;
  },
  deleteRate: async (parkingLotId: string, rateId: string) => {
    const response = await api.delete(`/parking-lots/${parkingLotId}/rates/${rateId}`);
    return response.data;
  }
};

export default rateService;
