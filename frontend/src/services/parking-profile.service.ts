import { api } from './api';
import type {
  CustomService,
  CustomServicePayload,
  ParkingProfileAdmin,
  ParkingProfilePublic,
  UpdateParkingProfilePayload,
} from '../types/parking-profile.types';

const base = (parkingLotId: string) => `/parking-profiles/${parkingLotId}`;

export const parkingProfileService = {
  /** Público: descripción, características y servicios activos */
  async getPublic(parkingLotId: string): Promise<ParkingProfilePublic> {
    const { data } = await api.get<ParkingProfilePublic>(`${base(parkingLotId)}/public`);
    return data;
  },

  /** Dueño: configuración completa */
  async getAdmin(parkingLotId: string): Promise<ParkingProfileAdmin> {
    const { data } = await api.get<ParkingProfileAdmin>(base(parkingLotId));
    return data;
  },

  async update(parkingLotId: string, payload: UpdateParkingProfilePayload): Promise<ParkingProfileAdmin> {
    const { data } = await api.put<ParkingProfileAdmin>(base(parkingLotId), payload);
    return data;
  },

  async createCustomService(parkingLotId: string, payload: CustomServicePayload): Promise<CustomService> {
    const { data } = await api.post<CustomService>(`${base(parkingLotId)}/custom-services`, payload);
    return data;
  },

  async updateCustomService(
    parkingLotId: string,
    serviceId: string,
    payload: Partial<CustomServicePayload>,
  ): Promise<CustomService> {
    const { data } = await api.patch<CustomService>(`${base(parkingLotId)}/custom-services/${serviceId}`, payload);
    return data;
  },

  async deleteCustomService(parkingLotId: string, serviceId: string): Promise<void> {
    await api.delete(`${base(parkingLotId)}/custom-services/${serviceId}`);
  },
};

/** El interceptor de api rechaza con el `message` de Nest (string o string[]) */
export const toErrorMessage = (err: unknown, fallback = 'Ocurrió un error inesperado'): string => {
  if (Array.isArray(err)) return err.join('. ');
  if (typeof err === 'string' && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};
