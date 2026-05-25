import type { Rate, CreateRateDto, UpdateRateDto, ApplicableRateQueryDto } from '../types/parking.types';
import type { UserVehicleType } from '../types/auth.types';
import { api } from './api';


export const ratesService = {
  /**
   * Crear tarifa (dueño/admin)
   */
  async create(data: CreateRateDto): Promise<Rate> {
    const response = await api.post<Rate>('/rates', data);
    return response.data;
  },

  /**
   * Obtener tarifas de un estacionamiento (público)
   */
  async getByParkingLot(parkingLotId: string): Promise<Rate[]> {
    const response = await api.get<Rate[]>(`/rates/parking-lot/${parkingLotId}`);
    return response.data;
  },

  /**
   * Obtener tarifas por tipo de vehículo (público)
   */
  async getByVehicleType(vehicleType: UserVehicleType): Promise<Rate[]> {
    const response = await api.get<Rate[]>(`/rates/vehicle-type/${vehicleType}`);
    return response.data;
  },

  /**
   * Obtener tarifa aplicable (público)
   */
  async getApplicableRate(query: ApplicableRateQueryDto): Promise<Rate> {
    const response = await api.get<Rate>('/rates/applicable', { params: query });
    return response.data;
  },

  /**
   * Obtener detalle de tarifa
   */
  async getById(id: string): Promise<Rate> {
    const response = await api.get<Rate>(`/rates/${id}`);
    return response.data;
  },

  /**
   * Actualizar tarifa (dueño/admin)
   */
  async update(id: string, data: UpdateRateDto): Promise<Rate> {
    const response = await api.patch<Rate>(`/rates/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar tarifa (dueño/admin)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/rates/${id}`);
  },
};