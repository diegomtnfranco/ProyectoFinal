import { create } from 'zustand';
import { occupancyService } from '../services/occupancy.service';
import type { ActiveOccupancy, Occupancy, CheckInDto } from '../types/parking.types';

interface OccupancyState {
  // Estado
  activeOccupancies: ActiveOccupancy[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  fetchActiveOccupancies: (parkingLotId: string) => Promise<void>;
  checkIn: (data: CheckInDto) => Promise<Occupancy>;
  checkOut: (spaceId: string) => Promise<void>;
  updateOccupancyInRealTime: (update: Partial<ActiveOccupancy>) => void;
  clearOccupancies: () => void;
  clearError: () => void;
}

export const useOccupancyStore = create<OccupancyState>((set, get) => ({
  // Estado inicial
  activeOccupancies: [],
  isLoading: false,
  error: null,

  // Obtener ocupaciones activas
  fetchActiveOccupancies: async (parkingLotId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await occupancyService.getActive(parkingLotId);
      set({ activeOccupancies: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Check-in
  checkIn: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newOccupancy = await occupancyService.checkIn(data);
      
      // ✅ Convertir correctamente con todos los campos requeridos
      const activeOccupancy: ActiveOccupancy = {
        id: newOccupancy.id,
        spaceId: newOccupancy.spaceId,
        space: {
          id: newOccupancy.spaceId,
          spaceNumber: '',
          status: 'occupied',
        },
        vehiclePlate: newOccupancy.vehiclePlate,
        vehicleType: newOccupancy.vehicleType,
        checkInTime: newOccupancy.checkInTime,
        checkedInBy: newOccupancy.checkedInBy||'',
        totalAmount: newOccupancy.totalAmount,
        hasReservation: !!(newOccupancy as any).reservationId,  // ← Verificar si tiene reserva
        reservationId: (newOccupancy as any).reservationId,
        isCompleted: false,
      };
      
      set((state) => ({
        activeOccupancies: [...state.activeOccupancies, activeOccupancy],
        isLoading: false,
      }));
      return newOccupancy;
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Check-out
  checkOut: async (spaceId) => {
    set({ isLoading: true, error: null });
    try {
      await occupancyService.checkOut({ spaceId });
      set((state) => ({
        activeOccupancies: state.activeOccupancies.filter(o => o.spaceId !== spaceId),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Actualización en tiempo real (WebSocket)
  updateOccupancyInRealTime: (update) => {
    set((state) => ({
      activeOccupancies: state.activeOccupancies.map(occupancy =>
        occupancy.id === update.id ? { ...occupancy, ...update } : occupancy
      ),
    }));
  },

  // Limpiar ocupaciones
  clearOccupancies: () => set({ activeOccupancies: [] }),

  // Limpiar error
  clearError: () => set({ error: null }),
}));