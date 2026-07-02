import type { CheckInDto, CheckOutDto, ActiveOccupancy, Occupancy, CheckOutResponseDto } from '../types/parking.types';
import { api } from './api';


export const occupancyService = {
  /**
   * Registrar check-in (dueño/empleado/admin)
   */
  async checkIn(data: CheckInDto): Promise<Occupancy> {
    const response = await api.post<Occupancy>('/occupancy/check-in', data);
    return response.data;
  },

  /**
   * Registrar check-out (dueño/empleado/admin)
   */
  async checkOut(data: CheckOutDto): Promise<CheckOutResponseDto> {
    const response = await api.post<CheckOutResponseDto>('/occupancy/check-out', data);
    return response.data;
  },

  /**
   * Obtener ocupaciones activas de un estacionamiento (dueño/empleado/admin)
   */
  async getActive(parkingLotId: string): Promise<ActiveOccupancy[]> {
    const response = await api.get<ActiveOccupancy[]>(`/occupancy/active/${parkingLotId}`);
    return response.data;
  },

  /**
   * Obtener historial de ocupaciones de un espacio
   */
  async getHistory(spaceId: string): Promise<Occupancy[]> {
    const response = await api.get<Occupancy[]>(`/occupancy/history/${spaceId}`);
    return response.data;
  },
};