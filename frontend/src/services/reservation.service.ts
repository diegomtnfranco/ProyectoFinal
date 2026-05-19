import api from './api';
import type { Reservation } from '../types/reservation.types';

const reservationService = {
  createReservation: async (payload: Partial<Reservation>) => {
    const response = await api.post<Reservation>('/reservations', payload);
    return response.data;
  },
  listReservations: async () => {
    const response = await api.get<Reservation[]>('/reservations');
    return response.data;
  },
  getReservation: async (id: string) => {
    const response = await api.get<Reservation>(`/reservations/${id}`);
    return response.data;
  },
  cancelReservation: async (id: string) => {
    const response = await api.patch<Reservation>(`/reservations/${id}/cancel`);
    return response.data;
  }
};

export default reservationService;
