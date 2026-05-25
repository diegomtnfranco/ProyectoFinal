// stores/spacesStore.ts
import { create } from 'zustand';
import { spacesService } from '../services/spaces.service';
import type { Space, CreateSpaceDto, UpdateSpaceStatusDto } from '../types/parking.types';
import type { UserVehicleType } from '../types/auth.types';

interface SpacesState {
  // Estado
  spaces: Space[];
  availableSpaces: Space[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  fetchSpaces: (parkingLotId: string) => Promise<void>;
  fetchAvailableSpaces: (parkingLotId: string, vehicleType?: UserVehicleType) => Promise<void>;
  createSpace: (data: CreateSpaceDto) => Promise<void>;
  updateSpaceStatus: (id: string, data: UpdateSpaceStatusDto) => Promise<void>;
  updateSpaceInRealTime: (spaceId: string, updates: Partial<Space>) => void;
  clearSpaces: () => void;
  clearError: () => void;
}

export const useSpacesStore = create<SpacesState>((set, get) => ({
  // Estado inicial
  spaces: [],
  availableSpaces: [],
  isLoading: false,
  error: null,

  // Obtener todos los espacios de un parking
  fetchSpaces: async (parkingLotId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await spacesService.getByParkingLot(parkingLotId);
      set({ spaces: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Obtener espacios disponibles
  fetchAvailableSpaces: async (parkingLotId, vehicleType) => {
    set({ isLoading: true, error: null });
    try {
      const data = await spacesService.getAvailable(parkingLotId, vehicleType);
      set({ availableSpaces: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Crear espacio
  createSpace: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newSpace = await spacesService.create(data);
      set((state) => ({
        spaces: [...state.spaces, newSpace],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Actualizar estado del espacio
  updateSpaceStatus: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await spacesService.updateStatus(id, data);
      set((state) => ({
        spaces: state.spaces.map(space => space.id === id ? updated : space),
        availableSpaces: state.availableSpaces.map(space => space.id === id ? updated : space),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Actualización en tiempo real (WebSocket)
  updateSpaceInRealTime: (spaceId, updates) => {
    set((state) => ({
      spaces: state.spaces.map(space => 
        space.id === spaceId ? { ...space, ...updates } : space
      ),
      availableSpaces: state.availableSpaces.map(space => 
        space.id === spaceId ? { ...space, ...updates } : space
      ),
    }));
  },

  // Limpiar espacios
  clearSpaces: () => set({ spaces: [], availableSpaces: [] }),

  // Limpiar error
  clearError: () => set({ error: null }),
}));