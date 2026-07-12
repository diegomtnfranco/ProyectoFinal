import { api } from './api';
import type { Space, CreateSpaceDto, UpdateSpaceDto, UpdateSpaceStatusDto } from '../types/parking.types';
import { type UserVehicleType } from '../types/auth.types';


export const spacesService = {
  /**
   * Crear espacio (dueño/admin)
   */
  async create(data: CreateSpaceDto): Promise<Space> {
    const response = await api.post<Space>('/spaces', data);
    return response.data;
  },

  /**
   * Obtener espacios de un estacionamiento (dueño/empleado/admin)
   */
  async getByParkingLot(parkingLotId: string): Promise<Space[]> {
    const response = await api.get<Space[]>(`/spaces/parking-lot/${parkingLotId}`);
    return response.data;
  },

  /**
   * Obtener espacios disponibles (público)
   */
  async getAvailable(parkingLotId: string, vehicleType?: UserVehicleType): Promise<Space[]> {
    const params = vehicleType ? { vehicleType } : {};
    const response = await api.get<Space[]>(`/spaces/parking-lot/${parkingLotId}/available`, { params });
    return response.data;
  },

  /**
   * Obtener detalle de espacio
   */
  async getById(id: string): Promise<Space> {
    const response = await api.get<Space>(`/spaces/${id}`);
    return response.data;
  },

  /**
   * Actualizar espacio (dueño/empleado/admin)
   */
  async update(id: string, data: UpdateSpaceDto): Promise<Space> {
    const response = await api.patch<Space>(`/spaces/${id}`, data);
    return response.data;
  },

  /**
   * Cambiar estado del espacio (dueño/empleado/admin)
   */
  async updateStatus(id: string, data: UpdateSpaceStatusDto): Promise<Space> {
    const response = await api.patch<Space>(`/spaces/${id}/status`, data);
    return response.data;
  },

  /**
   * desativar espacio (dueño/admin)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/spaces/${id}`);
  },

   /**
   * Obtener todos los espacios de un estacionamiento (incluyendo inactivos)
   * Solo para admin y dueños
   */
  async getAllByParkingLot(parkingLotId: string): Promise<Space[]> {
    const response = await api.get<Space[]>(`/spaces/parking-lot/${parkingLotId}/all`);
    return response.data;
  },

  /**
   * Reactivar espacio (cambiar isActive a true)
   */
  async reactivate(id: string, data: { isActive: boolean }): Promise<Space> {
    const response = await api.patch<Space>(`/spaces/${id}/reactivate`, data);
    return response.data;
  },
};
