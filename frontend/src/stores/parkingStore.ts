// frontend/src/stores/parkingStore.ts
import { create } from 'zustand';
import { parkingLotsService } from '../services/parking.service';
import type { ParkingLotWithStats, CreateParkingLotDto, UpdateParkingLotDto, ParkingLotNearbyResponseDto } from '../types/parking.types';

interface ParkingLotsState {
  // Estado
  currentParkingLot: ParkingLotWithStats | null;
  nearbyParkings: ParkingLotNearbyResponseDto[];
  isLoading: boolean;
  error: string | null;
  hasFetchedOnce: boolean;

  // Acciones
  fetchMyParkingLot: () => Promise<void>;
  fetchNearby: (lat: number, lng: number, radius?: number) => Promise<void>;
  updateParkingAvailability: (parkingId: string, availability: ParkingLotNearbyResponseDto['availability']) => void;
  createParkingLot: (data: CreateParkingLotDto) => Promise<void>;
  updateParkingLot: (id: string, data: UpdateParkingLotDto) => Promise<void>;
  clearCurrentParkingLot: () => void;
  clearError: () => void;
  reset: () => void;
  updateParkingImage: (userData: Partial<ParkingLotWithStats>) => void;
}

// ✅ Función auxiliar para extraer mensaje de error de forma segura
const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    // Intentar obtener el mensaje de diferentes formas
    const err = error as any;
    if (err?.response?.data?.message) {
      return err.response.data.message;
    }
    if (err?.message) {
      return err.message;
    }
    if (err?.toString && err.toString() !== '[object Object]') {
      return err.toString();
    }
  }
  return 'Error desconocido';
};

export const useParkingLotsStore = create<ParkingLotsState>((set, get) => ({
  // Estado inicial
  currentParkingLot: null,
  nearbyParkings: [],
  isLoading: false,
  error: null,
  hasFetchedOnce: false,

  // Obtener mi estacionamiento (dueño)
  fetchMyParkingLot: async () => {
    // ✅ Si ya se intentó una vez, no volver a intentar (evita loop)
    if (get().hasFetchedOnce) {
      console.log('🔍 fetchMyParkingLot: Ya se intentó una vez, omitiendo...');
      return;
    }

    // ✅ Si ya está cargando, no hacer nada
    if (get().isLoading) {
      console.log('🔍 fetchMyParkingLot: Ya está cargando, omitiendo...');
      return;
    }

    console.log('🔍 fetchMyParkingLot: Iniciando petición...');
    set({ isLoading: true, error: null });

    try {
      const data = await parkingLotsService.getMyParkingLot();
      console.log('✅ fetchMyParkingLot: Éxito', data);
      set({
        currentParkingLot: data,
        isLoading: false,
        hasFetchedOnce: true,
        error: null,
      });
    } catch (error: unknown) {
      // ✅ Usar la función auxiliar para obtener el mensaje
      const errorMessage = getErrorMessage(error);
      console.log('❌ fetchMyParkingLot: Error', errorMessage);

      set({
        error: errorMessage,
        isLoading: false,
        hasFetchedOnce: true,
        currentParkingLot: null,
      });
    }
  },

  // Buscar parkings cercanos (cliente)
  fetchNearby: async (lat, lng, radius = 1000) => {
    set({ isLoading: true, error: null });
    try {
      const data = await parkingLotsService.getNearby({ lat, lng, radius });
      set({ nearbyParkings: data, isLoading: false });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateParkingAvailability: (parkingId: string, availability: ParkingLotNearbyResponseDto['availability']) => {
    set((state) => ({
      nearbyParkings: state.nearbyParkings.map((parking) =>
        parking.id === parkingId
          ? { ...parking, availability, updatedAt: new Date().toISOString() }
          : parking
      ),
    }));
  },

  createParkingLot: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newParkingLot = await parkingLotsService.create(data);
      set({
        currentParkingLot: { ...newParkingLot, stats: { totalSpaces: 0, availableSpaces: 0, occupiedSpaces: 0, reservedSpaces: 0, maintenanceSpaces: 0 } } as ParkingLotWithStats,
        isLoading: false,
        hasFetchedOnce: true,
        error: null,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearCurrentParkingLot: () => set({
    currentParkingLot: null,
    hasFetchedOnce: false,
  }),

  clearError: () => set({
    error: null,
  }),

  reset: () => set({
    currentParkingLot: null,
    nearbyParkings: [],
    isLoading: false,
    error: null,
    hasFetchedOnce: false,
  }),

  updateParkingImage: (parkingData) => {
    const currentParking = get().currentParkingLot;

    if (!currentParking) return;

    set({
      currentParkingLot: {
        ...currentParking,
        ...parkingData,
      },
    });
  },
}));