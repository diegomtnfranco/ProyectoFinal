import { api } from './api';
import type { ActivityItem, ActivityTypeValue, PaginatedActivity } from '../types/activity.types';

export const activityService = {
  /** Últimas N actividades del estacionamiento (dueño/empleado/admin) */
  async getRecent(parkingLotId: string, limit = 3): Promise<ActivityItem[]> {
    const response = await api.get<ActivityItem[]>(`/activity/parking-lot/${parkingLotId}/recent`, {
      params: { limit },
    });
    return response.data;
  },

  /** Historial paginado, opcionalmente filtrado por tipo */
  async getPaginated(
    parkingLotId: string,
    params: { page?: number; limit?: number; type?: ActivityTypeValue } = {},
  ): Promise<PaginatedActivity> {
    const response = await api.get<PaginatedActivity>(`/activity/parking-lot/${parkingLotId}`, { params });
    return response.data;
  },
};
