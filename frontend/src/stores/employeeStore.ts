import { create } from 'zustand';
import { employeesService } from '../services/parking-employees.service';
import type { RegisterEmployeeDto, ParkingEmployee } from '../types/employee.types';

interface EmployeeState {
  employees: ParkingEmployee[];
  isLoading: boolean;
  error: string | null;
  
  fetchEmployees: (parkingLotId: string) => Promise<void>;
  createEmployee: (data: RegisterEmployeeDto, parkingLotId: string) => Promise<void>;
  updateEmployee: (id: string, data: Partial<ParkingEmployee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  isLoading: false,
  error: null,

  fetchEmployees: async (parkingLotId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await employeesService.getByParkingLot(parkingLotId);
      // Asegurar que cada empleado tenga un campo email accesible
      const employeesWithEmail = data.map(emp => ({
        ...emp,
        email: emp.user?.email || emp.email || 'Email no disponible',
      }));
      set({ employees: employeesWithEmail, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
    }
  },

  createEmployee: async (data: RegisterEmployeeDto, parkingLotId: string) => {
    set({ isLoading: true, error: null });
    try {
      await employeesService.create(data);
      // Recargar la lista completa para obtener el empleado con sus relaciones
      const employees = await employeesService.getByParkingLot(parkingLotId);
      const employeesWithEmail = employees.map(emp => ({
        ...emp,
        email: emp.user?.email || emp.email || 'Email no disponible',
      }));
      set({ employees: employeesWithEmail, isLoading: false });
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  updateEmployee: async (id: string, data: Partial<ParkingEmployee>) => {
  console.log('📡 [STORE] updateEmployee llamado con id:', id, data);
  set({ isLoading: true, error: null });
  try {
    const updated = await employeesService.update(id, data);
    set((state) => ({
      employees: state.employees.map(e => e.id === id ? { ...updated, email: updated.user?.email || updated.email } : e),
      isLoading: false,
    }));
  } catch (error) {
    set({ error: error as string, isLoading: false });
    throw error;
  }
},

 deleteEmployee: async (id: string) => {
  console.log('📡 [STORE] deleteEmployee llamado con id:', id);
  set({ isLoading: true, error: null });
  try {
    await employeesService.delete(id);
    console.log('✅ [STORE] Empleado eliminado exitosamente');
    set((state) => ({
      employees: state.employees.filter(e => e.id !== id),
      isLoading: false,
    }));
  } catch (error) {
    console.error('❌ [STORE] Error al eliminar empleado:', error);
    set({ error: error as string, isLoading: false });
    throw error;
  }
},
  clearError: () => set({ error: null }),
}));