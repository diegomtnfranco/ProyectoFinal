import { create } from 'zustand';
import { ratesService } from '../services/rates.service';
import type { Rate, CreateRateDto, UpdateRateDto } from '../types/parking.types';

interface RatesState {
  rates: Rate[];
  isLoading: boolean;
  error: string | null;
  
  fetchRatesByParkingLot: (parkingLotId: string) => Promise<void>;
  createRate: (data: CreateRateDto) => Promise<void>;
  updateRate: (id: string, data: UpdateRateDto) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;
  clearRates: () => void;
  clearError: () => void;
}

export const useRatesStore = create<RatesState>((set, get) => ({
  rates: [],
  isLoading: false,
  error: null,

  fetchRatesByParkingLot: async (parkingLotId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await ratesService.getByParkingLot(parkingLotId);
      set({ rates: data, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  createRate: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newRate = await ratesService.create(data);
      set((state) => ({
        rates: [...state.rates, newRate],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  updateRate: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await ratesService.update(id, data);
      set((state) => ({
        rates: state.rates.map(rate => rate.id === id ? updated : rate),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  deleteRate: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await ratesService.delete(id);
      set((state) => ({
        rates: state.rates.filter(rate => rate.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  clearRates: () => set({ rates: [] }),
  clearError: () => set({ error: null }),
}));
