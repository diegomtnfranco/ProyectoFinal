import { create } from 'zustand';
import parkingService from '../services/parking.service';
import type{ ParkingLot, Space, Rate } from '../types/parking.types';

interface ParkingState {
  parkingLots: ParkingLot[];
  selectedLot: ParkingLot | null;
  spaces: Space[];
  rates: Rate[];
  isLoading: boolean;
  loadParkingLots: () => Promise<void>;
  loadParkingLot: (id: string) => Promise<void>;
  loadSpaces: (parkingLotId: string) => Promise<void>;
  loadRates: (parkingLotId: string) => Promise<void>;
}

const useParkingStore = create<ParkingState>((set) => ({
  parkingLots: [],
  selectedLot: null,
  spaces: [],
  rates: [],
  isLoading: false,
  loadParkingLots: async () => {
    set({ isLoading: true });
    try {
      const parkingLots = await parkingService.listParkingLots();
      set({ parkingLots });
    } finally {
      set({ isLoading: false });
    }
  },
  loadParkingLot: async (id: string) => {
    set({ isLoading: true });
    try {
      const selectedLot = await parkingService.getParkingLot(id);
      set({ selectedLot });
    } finally {
      set({ isLoading: false });
    }
  },
  loadSpaces: async (parkingLotId: string) => {
    set({ isLoading: true });
    try {
      const spaces = await parkingService.listSpaces(parkingLotId);
      set({ spaces });
    } finally {
      set({ isLoading: false });
    }
  },
  loadRates: async (parkingLotId: string) => {
    set({ isLoading: true });
    try {
      const rates = await parkingService.listRates(parkingLotId);
      set({ rates });
    } finally {
      set({ isLoading: false });
    }
  }
}));

export default useParkingStore;
