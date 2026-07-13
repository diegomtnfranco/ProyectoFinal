// frontend/src/stores/reservationStore.ts
import { create } from 'zustand';
import { reservationsService } from '../services/reservations.service';
import type { Reservation, CreateReservationDto } from '../types/parking.types';
import type { ReservationStatusType } from '../types/auth.types';
interface ReservationsState {
  // Estado
  myReservations: Reservation[];
  parkingReservations: Reservation[];
  currentReservation: Reservation | null;
  isLoading: boolean;
  error: string | null;
  totalSpent: number;
  
  // Acciones
  fetchMyReservations: () => Promise<void>;
  fetchParkingReservations: (parkingLotId: string) => Promise<void>;
  createReservation: (data: CreateReservationDto) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  confirmReservation: (id: string) => Promise<void>;
  cancelByParking: (id: string, reason?: string) => Promise<void>;
  changeSpace: (id: string, newSpaceId: string) => Promise<void>;
  updateReservationStatus: (id: string, status: ReservationStatusType) => void;
  clearCurrentReservation: () => void;
  clearError: () => void;
  calculateTotalSpent: () => number;
}

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  // Estado inicial
  myReservations: [],
  parkingReservations: [],
  currentReservation: null,
  isLoading: false,
  error: null,
  totalSpent: 0,

  // Obtener mis reservas (cliente)
  fetchMyReservations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await reservationsService.getMyReservations();
      set({ myReservations: data, isLoading: false });
      get().calculateTotalSpent();
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
      get().calculateTotalSpent();
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

  // Actualizar estado de reserva desde WebSocket
  updateReservationStatus: (id: string, status: ReservationStatusType) => {
    set((state) => ({
      myReservations: state.myReservations.map(r => 
        r.id === id ? { ...r, status } : r
      ),
    }));
    get().calculateTotalSpent();
  },

  // Calcular total gastado
  calculateTotalSpent: () => {
  const { myReservations } = get();

  const completedTotal = myReservations
    .filter(r => r.status === 'completed')
    .reduce(
      (sum, r) => sum + Number(r.totalAmount || 0),
      0
    );

  set({ totalSpent: completedTotal });

  return completedTotal;
},

  // Limpiar reserva actual
  clearCurrentReservation: () => set({ currentReservation: null }),

  // Limpiar error
  clearError: () => set({ error: null }),
}));