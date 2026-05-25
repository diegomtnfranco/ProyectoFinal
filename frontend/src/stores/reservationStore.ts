// stores/reservationsStore.ts
import { create } from 'zustand';
import { reservationsService } from '../services/reservations.service';
import type { Reservation, CreateReservationDto } from '../types/parking.types';

interface ReservationsState {
  // Estado
  myReservations: Reservation[];
  parkingReservations: Reservation[];
  currentReservation: Reservation | null;
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  fetchMyReservations: () => Promise<void>;
  fetchParkingReservations: (parkingLotId: string) => Promise<void>;
  createReservation: (data: CreateReservationDto) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  confirmReservation: (id: string) => Promise<void>;
  cancelByParking: (id: string, reason?: string) => Promise<void>;
  changeSpace: (id: string, newSpaceId: string) => Promise<void>;
  clearCurrentReservation: () => void;
  clearError: () => void;
}

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  // Estado inicial
  myReservations: [],
  parkingReservations: [],
  currentReservation: null,
  isLoading: false,
  error: null,

  // Obtener mis reservas (cliente)
  fetchMyReservations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await reservationsService.getMyReservations();
      set({ myReservations: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Obtener reservas del parking (dueño/empleado)
  fetchParkingReservations: async (parkingLotId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await reservationsService.getByParkingLot(parkingLotId);
      set({ parkingReservations: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Crear reserva
  createReservation: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newReservation = await reservationsService.create(data);
      set((state) => ({
        myReservations: [newReservation, ...state.myReservations],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Cancelar reserva (cliente)
  cancelReservation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const cancelled = await reservationsService.cancelByClient(id);
      set((state) => ({
        myReservations: state.myReservations.map(r => r.id === id ? cancelled : r),
        parkingReservations: state.parkingReservations.map(r => r.id === id ? cancelled : r),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Confirmar reserva (dueño/empleado)
  confirmReservation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const confirmed = await reservationsService.confirm(id);
      set((state) => ({
        parkingReservations: state.parkingReservations.map(r => r.id === id ? confirmed : r),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Cancelar reserva por el parking (dueño/empleado)
  cancelByParking: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      const cancelled = await reservationsService.cancelByParking(id, reason);
      set((state) => ({
        parkingReservations: state.parkingReservations.map(r => r.id === id ? cancelled : r),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Cambiar espacio asignado
  changeSpace: async (id, newSpaceId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await reservationsService.changeSpace(id, newSpaceId);
      set((state) => ({
        parkingReservations: state.parkingReservations.map(r => r.id === id ? updated : r),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Limpiar reserva actual
  clearCurrentReservation: () => set({ currentReservation: null }),

  // Limpiar error
  clearError: () => set({ error: null }),
}));