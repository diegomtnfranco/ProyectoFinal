import { api } from './api';
import type {
  Reservation,
  CreateReservationDto,
  UpdateReservationDto,
  FilterReservationsDto,
} from '../types/parking.types';

export const reservationsService = {
  /**
   * Crear reserva (cliente)
   */
  async create(data: CreateReservationDto): Promise<Reservation> {
    const response = await api.post<Reservation>('/reservations', data);
    return response.data;
  },

  /**
   * Obtener mis reservas (cliente)
   */
  async getMyReservations(): Promise<Reservation[]> {
    const response = await api.get<Reservation[]>('/reservations/my');
    return response.data;
  },

  /**
   * Obtener reservas de un estacionamiento (dueño/empleado/admin)
   */
  async getByParkingLot(parkingLotId: string): Promise<Reservation[]> {
    const response = await api.get<Reservation[]>(`/reservations/parking-lot/${parkingLotId}`);
    return response.data;
  },

  /**
   * Obtener detalle de reserva
   */
  async getById(id: string): Promise<Reservation> {
    const response = await api.get<Reservation>(`/reservations/${id}`);
    return response.data;
  },

  /**
   * Confirmar reserva (dueño/empleado/admin)
   */
  async confirm(id: string): Promise<Reservation> {
    const response = await api.patch<Reservation>(`/reservations/${id}/confirm`);
    return response.data;
  },

  /**
   * Cancelar reserva por cliente
   */
  async cancelByClient(id: string): Promise<Reservation> {
    const response = await api.post<Reservation>(`/reservations/${id}/cancel`);
    return response.data;
  },

  /**
   * Cancelar reserva por estacionamiento (dueño/empleado/admin)
   */
  async cancelByParking(id: string, reason?: string): Promise<Reservation> {
    const response = await api.post<Reservation>(`/reservations/${id}/cancel-by-parking`, { reason });
    return response.data;
  },

  /**
   * Cambiar espacio asignado (dueño/empleado/admin)
   */
  async changeSpace(id: string, newSpaceId: string): Promise<Reservation> {
    const response = await api.patch<Reservation>(`/reservations/${id}/change-space`, { newSpaceId });
    return response.data;
  },

  /**
   * Listar reservas con filtros (admin)
   */
  async getAll(filters?: FilterReservationsDto): Promise<Reservation[]> {
    const response = await api.get<Reservation[]>('/reservations', { params: filters });
    return response.data;
  },

  /**
   * Eliminar reserva (admin)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/reservations/${id}`);
  },
};