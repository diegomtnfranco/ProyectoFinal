// frontend/src/stores/adminStore.ts
import { create } from 'zustand';
import { adminService, type ParkingLotsQueryParams, type PaginatedResponse } from '../services/admin.service';
import type { 
  AdminParkingLot, 
  AdminParkingLotDetailResponse,
} from '../types/admin.types';

interface AdminState {
  parkingLots: AdminParkingLot[];
  currentParkingLot: AdminParkingLotDetailResponse | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  currentParams: ParkingLotsQueryParams | null;
  
  fetchAllParkingLots: (params?: ParkingLotsQueryParams) => Promise<void>;
  fetchParkingLotDetails: (id: string) => Promise<void>;
  toggleParkingLotStatus: (id: string, isActive: boolean) => Promise<void>;
  updateParkingLot: (id: string, data: Partial<AdminParkingLot>) => Promise<void>;
  deleteParkingLot: (id: string) => Promise<void>;
  clearCurrentParkingLot: () => void;
  clearError: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  parkingLots: [],
  currentParkingLot: null,
  isLoading: false,
  error: null,
  total: 0,
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  currentParams: null,

  fetchAllParkingLots: async (params) => {
    set({ isLoading: true, error: null, currentParams: params || null });
    try {
      const response = await adminService.getAllParkingLots(params);
      const data = response?.data || [];
      set({ 
        parkingLots: data, 
        total: response?.total || 0,
        currentPage: response?.page || 1,
        totalPages: response?.totalPages || 1,
        limit: response?.limit || 10,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching parking lots:', error);
      set({ 
        error: error as string, 
        isLoading: false,
        parkingLots: []
      });
    }
  },

  fetchParkingLotDetails: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await adminService.getParkingLotDetails(id);
      set({ currentParkingLot: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  toggleParkingLotStatus: async (id: string, isActive: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await adminService.toggleParkingLotStatus(id, isActive);
      
      // Actualizar estado local inmediatamente
      set((state) => ({
        parkingLots: (state.parkingLots || []).map(p => 
          p.id === id ? { ...p, isActive } : p
        ),
        currentParkingLot: state.currentParkingLot?.id === id 
          ? { ...state.currentParkingLot, isActive }
          : state.currentParkingLot,
        isLoading: false,
      }));
      
      // Recargar la lista completa para mantener consistencia con el backend
      // Usar los parámetros actuales para mantener la página y filtros
      const currentParams = get().currentParams;
      if (currentParams) {
        await get().fetchAllParkingLots(currentParams);
      } else {
        await get().fetchAllParkingLots({
          page: get().currentPage,
          limit: get().limit,
        });
      }
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  updateParkingLot: async (id: string, data: Partial<AdminParkingLot>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await adminService.updateParkingLot(id, data);
      set((state) => ({
        parkingLots: (state.parkingLots || []).map(p => 
          p.id === id ? updated : p
        ),
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

  deleteParkingLot: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await adminService.deleteParkingLot(id);
      set((state) => ({
        parkingLots: (state.parkingLots || []).filter(p => p.id !== id),
        total: (state.total || 0) - 1,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  clearCurrentParkingLot: () => set({ currentParkingLot: null }),
  clearError: () => set({ error: null }),
  setPage: (page: number) => set({ currentPage: page }),
  setLimit: (limit: number) => set({ limit }),
}));