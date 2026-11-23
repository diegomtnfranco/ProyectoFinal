import { api } from './api';
import type { OccupancyAlertSubscription, UserNotificationPage } from '../types/user-notifications.types';

/** Centro de notificaciones: siempre del usuario autenticado (el backend usa el token) */
export const userNotificationsService = {
  async list(page = 1, limit = 15): Promise<UserNotificationPage> {
    const { data } = await api.get<UserNotificationPage>('/user-notifications/me', { params: { page, limit } });
    return data;
  },
  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ unreadCount: number }>('/user-notifications/me/unread-count');
    return data.unreadCount;
  },
  async markRead(id: string): Promise<{ id: string; readAt: string; unreadCount: number }> {
    const { data } = await api.patch<{ id: string; readAt: string; unreadCount: number }>(`/user-notifications/me/${id}/read`);
    return data;
  },
};

/** Alertas "avisame cuando se libere un lugar" (solo clientes) */
export const occupancyAlertsService = {
  async list(): Promise<OccupancyAlertSubscription[]> {
    const { data } = await api.get<OccupancyAlertSubscription[]>('/occupancy-alerts/me');
    return data;
  },
  async activate(parkingLotId: string): Promise<void> {
    await api.put(`/occupancy-alerts/me/${parkingLotId}`);
  },
  async deactivate(parkingLotId: string): Promise<void> {
    await api.delete(`/occupancy-alerts/me/${parkingLotId}`);
  },
};
