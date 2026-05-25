// stores/parkingStore.ts (corregido)
import { create } from 'zustand';
import { parkingLotsService } from '../services/parking.service';
import type { ParkingLot, ParkingLotWithStats, CreateParkingLotDto, UpdateParkingLotDto } from '../types/parking.types';

interface ParkingLotsState {
  // Estado
  currentParkingLot: ParkingLotWithStats | null;
  nearbyParkings: ParkingLot[];  // ← Cambiado: ParkingLot[] en lugar de ParkingLotWithStats[]
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  fetchMyParkingLot: () => Promise<void>;
  fetchNearby: (lat: number, lng: number, radius?: number) => Promise<void>;
  createParkingLot: (data: CreateParkingLotDto) => Promise<void>;
  updateParkingLot: (id: string, data: UpdateParkingLotDto) => Promise<void>;
  clearCurrentParkingLot: () => void;
  clearError: () => void;
}

export const useParkingLotsStore = create<ParkingLotsState>((set, get) => ({
  // Estado inicial
  currentParkingLot: null,
  nearbyParkings: [],
  isLoading: false,
  error: null,

  // Obtener mi estacionamiento (dueño) - esto SÍ tiene stats
  fetchMyParkingLot: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await parkingLotsService.getMyParkingLot();
      set({ currentParkingLot: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Buscar parkings cercanos (cliente) - esto NO tiene stats
  fetchNearby: async (lat, lng, radius = 1000) => {
    set({ isLoading: true, error: null });
    try {
      const data = await parkingLotsService.getNearby({ lat, lng, radius });
      set({ nearbyParkings: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Crear estacionamiento
  createParkingLot: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newParkingLot = await parkingLotsService.create(data);
      set((state) => ({
        currentParkingLot: { ...newParkingLot, stats: { totalSpaces: 0, availableSpaces: 0, occupiedSpaces: 0, reservedSpaces: 0, maintenanceSpaces: 0 } } as ParkingLotWithStats,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Actualizar estacionamiento
  updateParkingLot: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await parkingLotsService.update(id, data);
      set((state) => ({
        currentParkingLot: state.currentParkingLot?.id === id 
          ? { ...state.currentParkingLot, ...updated }
          : state.currentParkingLot,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Limpiar estacionamiento actual
  clearCurrentParkingLot: () => set({ currentParkingLot: null }),

  // Limpiar error
  clearError: () => set({ error: null }),
}));