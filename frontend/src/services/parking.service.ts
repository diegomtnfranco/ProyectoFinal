import api from './api';
import type { ParkingLot, Space, Rate } from '../types/parking.types';

const parkingService = {
  listParkingLots: async () => {
    const response = await api.get<ParkingLot[]>('/parking-lots');
    return response.data;
  },
  getParkingLot: async (id: string) => {
    const response = await api.get<ParkingLot>(`/parking-lots/${id}`);
    return response.data;
  },
  createParkingLot: async (payload: Partial<ParkingLot>) => {
    const response = await api.post<ParkingLot>('/parking-lots', payload);
    return response.data;
  },
  updateParkingLot: async (id: string, payload: Partial<ParkingLot>) => {
    const response = await api.put<ParkingLot>(`/parking-lots/${id}`, payload);
    return response.data;
  },
  listSpaces: async (parkingLotId: string) => {
    const response = await api.get<Space[]>(`/parking-lots/${parkingLotId}/spaces`);
    return response.data;
  },
  createSpace: async (parkingLotId: string, payload: Partial<Space>) => {
    const response = await api.post<Space>(`/parking-lots/${parkingLotId}/spaces`, payload);
    return response.data;
  },
  listRates: async (parkingLotId: string) => {
    const response = await api.get<Rate[]>(`/parking-lots/${parkingLotId}/rates`);
    return response.data;
  }
};

export default parkingService;
