// stores/spacesStore.ts
import { create } from 'zustand';
import { spacesService } from '../services/spaces.service';
import type { Space, CreateSpaceDto, UpdateSpaceStatusDto, Occupancy, CheckOutResponseDto } from '../types/parking.types';
import type { UserVehicleType } from '../types/auth.types';
import { SpaceStatus } from '../types/auth.types';

// Función helper para ordenar espacios por número
const sortSpacesByNumber = (spaces: Space[]): Space[] => {
  return [...spaces].sort((a, b) => {
    // Extraer número del spaceNumber (ej: "A1", "001", "B2", "P-1")
    const matchA = a.spaceNumber.match(/\d+/);
    const matchB = b.spaceNumber.match(/\d+/);
    const numA = matchA ? parseInt(matchA[0]) : 0;
    const numB = matchB ? parseInt(matchB[0]) : 0;
    return numA - numB;
  });
};

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
  occupySpace: (id: string, vehiclePlate: string, vehicleType: UserVehicleType, reservationId?: string) => Promise<void>;  // ← Actualizar firma
  liberateSpace: (id: string) => Promise<CheckOutResponseDto>;  // ← Actualizar firma
  updateSpaceInRealTime: (spaceId: string, updates: Partial<Space>) => void;
  clearSpaces: () => void;
  clearError: () => void;
  removeSpace: (id: string) => Promise<void>;  
  fetchAllSpaces: (parkingLotId: string) => Promise<void>; 
  reactivateSpace: (id: string) => Promise<void>;
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
      // ✅ Ordenar espacios por número
      const sortedSpaces = sortSpacesByNumber(data);
      set({ spaces: sortedSpaces, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Obtener espacios disponibles
  fetchAvailableSpaces: async (parkingLotId, vehicleType) => {
    set({ isLoading: true, error: null });
    try {
      const data = await spacesService.getAvailable(parkingLotId, vehicleType);
      // ✅ Ordenar espacios disponibles
      const sortedSpaces = sortSpacesByNumber(data);
      set({ availableSpaces: sortedSpaces, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  // Crear espacio
  createSpace: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newSpace = await spacesService.create(data);
      set((state) => {
        const updatedSpaces = [...state.spaces, newSpace];
        return {
          spaces: sortSpacesByNumber(updatedSpaces),
          isLoading: false,
        };
      });
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Actualizar estado del espacio (manteniendo orden)
  updateSpaceStatus: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await spacesService.updateStatus(id, data);
      set((state) => {
        const updatedSpaces = state.spaces.map(space => 
          space.id === id ? { ...space, ...updated, status: data.status } : space
        );
        const updatedAvailable = state.availableSpaces.map(space => 
          space.id === id ? { ...space, ...updated, status: data.status } : space
        );
        return {
          spaces: sortSpacesByNumber(updatedSpaces),
          availableSpaces: sortSpacesByNumber(updatedAvailable),
          isLoading: false,
        };
      });
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  occupySpace: async (id: string, vehiclePlate: string, vehicleType: UserVehicleType, reservationId?: string) => {
  set({ isLoading: true, error: null });
  try {
    const { occupancyService } = await import('../services/occupancy.service');
    await occupancyService.checkIn({
      spaceId: id,
      vehiclePlate,
      vehicleType,
      reservationId,  // ← Pasar el reservationId
    });
    
    set((state) => {
      const updatedSpaces = state.spaces.map(space => 
        space.id === id 
          ? { 
              ...space, 
              status: SpaceStatus.OCCUPIED,
              occupiedByVehiclePlate: vehiclePlate,
              occupiedByVehicleType: vehicleType,
              occupiedSince: new Date().toISOString(),
              isReserved: false,
              reservedUntil: undefined
            } 
          : space
      );
      const updatedAvailable = state.availableSpaces.filter(space => space.id !== id);
      return {
        spaces: sortSpacesByNumber(updatedSpaces),
        availableSpaces: sortSpacesByNumber(updatedAvailable),
        isLoading: false,
      };
    });
  } catch (error) {
    set({ error: error as string, isLoading: false });
    throw error;
  }
},


  // Liberar espacio (check-out)
  liberateSpace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Llamar al servicio de occupancy para check-out
      const { occupancyService } = await import('../services/occupancy.service');
        const result =await occupancyService.checkOut({ spaceId: id });
      
      // Actualizar el espacio localmente
      set((state) => {
        const updatedSpaces = state.spaces.map(space => 
          space.id === id 
            ? { 
                ...space, 
                status: SpaceStatus.AVAILABLE,
                occupiedByVehiclePlate: undefined,
                occupiedByVehicleType: undefined,
                occupiedSince: undefined,
                isReserved: false,
                reservedUntil: undefined
              } 
            : space
        );
        const updatedAvailable = sortSpacesByNumber(
          updatedSpaces.filter(space => space.status === SpaceStatus.AVAILABLE)
        );
        return {
          spaces: sortSpacesByNumber(updatedSpaces),
          availableSpaces: updatedAvailable,
          isLoading: false,
        };
        
      });
       return result;
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  // Actualización en tiempo real (WebSocket)
  updateSpaceInRealTime: (spaceId, updates) => {
    set((state) => {
      const updatedSpaces = state.spaces.map(space => 
        space.id === spaceId ? { ...space, ...updates } : space
      );
      const updatedAvailable = updatedSpaces.filter(space => space.status === SpaceStatus.AVAILABLE);
      return {
        spaces: sortSpacesByNumber(updatedSpaces),
        availableSpaces: sortSpacesByNumber(updatedAvailable),
      };
    });
  },

  // Limpiar espacios
  clearSpaces: () => set({ spaces: [], availableSpaces: [] }),

  // Limpiar error
  clearError: () => set({ error: null }),

    removeSpace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await spacesService.delete(id);
      set((state) => ({
        spaces: state.spaces.filter(space => space.id !== id),
        availableSpaces: state.availableSpaces.filter(space => space.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  fetchAllSpaces: async (parkingLotId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await spacesService.getAllByParkingLot(parkingLotId);
      const sortedSpaces = sortSpacesByNumber(data);
      set({ spaces: sortedSpaces, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },
  
  reactivateSpace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const reactivated = await spacesService.reactivate(id,{ isActive:true });
      console.log('Espacio reactivado:', reactivated);
      set((state) => {
        const updatedSpaces = state.spaces.map(space => 
          space.id === id ? { ...reactivated, status: SpaceStatus.AVAILABLE, isActive: true } : space
        );
        const updatedAvailable = sortSpacesByNumber(
          updatedSpaces.filter(space => space.status === SpaceStatus.AVAILABLE && space.isActive !== false)
        );
        return {
          spaces: sortSpacesByNumber(updatedSpaces),
          availableSpaces: updatedAvailable,
          isLoading: false,
        };
      });
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },
}));