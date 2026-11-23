import { api } from './api';
import type { ClientVehicle, ClientVehiclePayload, MyTracking, TrackingEvent } from '../types/client-tracking.types';

export const clientVehiclesService = {
  async list(): Promise<ClientVehicle[]> {
    const { data } = await api.get<ClientVehicle[]>('/client-vehicles/me');
    return data;
  },
  async create(payload: ClientVehiclePayload): Promise<ClientVehicle> {
    const { data } = await api.post<ClientVehicle>('/client-vehicles/me', payload);
    return data;
  },
  async update(id: string, payload: Partial<ClientVehiclePayload>): Promise<ClientVehicle> {
    const { data } = await api.patch<ClientVehicle>(`/client-vehicles/me/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/client-vehicles/me/${id}`);
  },
};

export const clientTrackingService = {
  async getMine(): Promise<MyTracking> {
    const { data } = await api.get<MyTracking>('/client-tracking/me');
    return data;
  },
  async getEvents(): Promise<TrackingEvent[]> {
    const { data } = await api.get<TrackingEvent[]>('/client-tracking/me/events');
    return data;
  },
};
