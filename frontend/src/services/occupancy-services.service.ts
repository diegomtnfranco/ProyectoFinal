import { api } from './api';
import type { NightPolicy, NightRateModeValue, OccupancyServices, OfferedService, ServiceExecutionStatus } from '../types/occupancy-services.types';

export const occupancyServicesService = {
  /** Dueño: política de tarifa nocturna */
  async getNightPolicy(parkingLotId: string): Promise<NightPolicy> {
    const { data } = await api.get<NightPolicy>(`/parking-profiles/${parkingLotId}/night-policy`);
    return data;
  },

  async updateNightPolicy(parkingLotId: string, payload: { mode: NightRateModeValue; nightAmount?: number | null }): Promise<NightPolicy> {
    const { data } = await api.put<NightPolicy>(`/parking-profiles/${parkingLotId}/night-policy`, payload);
    return data;
  },

  /** Público: servicios del estacionamiento del QR de ingreso */
  async getQrServices(token: string): Promise<OfferedService[]> {
    const { data } = await api.get<OfferedService[]>('/occupancy/anonymous/services', { params: { token } });
    return data;
  },

  /** Dueño/empleado: servicios para el ingreso manual */
  async getSelectableServices(parkingLotId: string): Promise<OfferedService[]> {
    const { data } = await api.get<OfferedService[]>(`/parking-profiles/${parkingLotId}/selectable-services`);
    return data;
  },

  /** Dueño/empleado: servicios de la ocupación activa de un espacio */
  async getForSpace(spaceId: string): Promise<OccupancyServices> {
    const { data } = await api.get<OccupancyServices>(`/occupancy/space/${spaceId}/services`);
    return data;
  },

  /** Dueño/empleado: marcar si un servicio seleccionado se realizó */
  async setServiceStatus(occupancyId: string, serviceKey: string, status: ServiceExecutionStatus): Promise<OccupancyServices> {
    const { data } = await api.patch<OccupancyServices>(
      `/occupancy/${occupancyId}/services/${encodeURIComponent(serviceKey)}/status`,
      { status },
    );
    return data;
  },

  async updateForOccupancy(occupancyId: string, serviceKeys: string[]): Promise<OccupancyServices> {
    const { data } = await api.put<OccupancyServices>(`/occupancy/${occupancyId}/services`, { serviceKeys });
    return data;
  },
};
