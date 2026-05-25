import type {
  ParkingLot,
  ParkingLotWithStats,
  CreateParkingLotDto,
  UpdateParkingLotDto,
  NearbyQueryDto,
} from '../types/parking.types';
import { api } from './api';


export const parkingLotsService = {
  /**
   * Crear estacionamiento (dueño/admin)
   */
  async create(data: CreateParkingLotDto): Promise<ParkingLot> {
    const response = await api.post<ParkingLot>('/parking-lots', data);
    return response.data;
  },

  /**
   * Obtener mi estacionamiento (dueño autenticado)
   */
  async getMyParkingLot(): Promise<ParkingLotWithStats> {
    const response = await api.get<ParkingLotWithStats>('/parking-lots/my');
    return response.data;
  },

  /**
   * Buscar estacionamientos cercanos (público)
   */
  async getNearby(query: NearbyQueryDto): Promise<ParkingLot[]> {
    const response = await api.get<ParkingLot[]>('/parking-lots/nearby', { params: query });
    return response.data;
  },

  
  /**
   * Obtener detalle de estacionamiento (público)
   */
  async getById(id: string): Promise<ParkingLot> {
    const response = await api.get<ParkingLot>(`/parking-lots/${id}`);
    return response.data;
  },

  /**
   * Obtener disponibilidad (público)
   */
  async getAvailability(id: string): Promise<{ total: number; available: number; occupied: number; reserved: number }> {
    const response = await api.get(`/parking-lots/${id}/availability`);
    return response.data;
  },

  /**
   * Actualizar estacionamiento (dueño/admin)
   */
  async update(id: string, data: UpdateParkingLotDto): Promise<ParkingLot> {
    const response = await api.patch<ParkingLot>(`/parking-lots/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar estacionamiento (dueño/admin)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/parking-lots/${id}`);
  },
};