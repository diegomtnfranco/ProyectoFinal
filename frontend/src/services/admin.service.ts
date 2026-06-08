// frontend/src/services/admin.service.ts
import { api } from './api';
import type { 
  AdminParkingLot, 
  AdminParkingLotDetailResponse,
} from '../types/admin.types';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ParkingLotsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export const adminService = {
  /**
   * Obtener todos los estacionamientos con paginación (admin)
   */
  async getAllParkingLots(params?: ParkingLotsQueryParams): Promise<PaginatedResponse<AdminParkingLot>> {
    const response = await api.get<PaginatedResponse<AdminParkingLot>>('/parking-lots', { params });
    return response.data;
  },

  /**
   * Obtener detalle de un estacionamiento (admin)
   */
  async getParkingLotDetails(id: string): Promise<AdminParkingLotDetailResponse> {
    const response = await api.get<AdminParkingLotDetailResponse>(`/parking-lots/${id}`);
    return response.data;
  },

  /**
   * Actualizar un estacionamiento (admin)
   */
  async updateParkingLot(id: string, data: Partial<AdminParkingLot>): Promise<AdminParkingLot> {
    const response = await api.patch<AdminParkingLot>(`/parking-lots/${id}`, data);
    return response.data;
  },

  /**
   * Desactivar/Activar un estacionamiento (admin)
   * Esto cambia el estado isActive del parking
   */
async toggleParkingLotStatus(id: string, isActive: boolean): Promise<void> {
  await api.patch(`/parking-lots/${id}/status`, { isActive });
},

  /**
   * Desactivar un estacionamiento (admin) - DELETE lógico
   * En lugar de eliminar físicamente, solo desactivamos
   * NOTA: Este método es redundante con toggleParkingLotStatus, 
   * lo mantengo por compatibilidad pero internamente hace lo mismo
   */
  async deleteParkingLot(id: string): Promise<void> {
    // DELETE lógico: solo desactivar, no eliminar físicamente
    await api.patch(`/parking-lots/${id}`, { isActive: false });
  },
};