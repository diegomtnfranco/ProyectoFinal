import { api } from './api';
import type { RegisterEmployeeDto, ParkingEmployee } from '../types/employee.types';

export const employeesService = {
  /**
   * Obtener empleados de un estacionamiento
   */
  async getByParkingLot(parkingLotId: string): Promise<ParkingEmployee[]> {
    const response = await api.get<ParkingEmployee[]>(`/parking-employees/parking-lot/${parkingLotId}`);
    return response.data;
  },

  /**
   * Crear empleado - Usa el endpoint de auth
   */
  async create(data: RegisterEmployeeDto): Promise<{ user: any; message: string }> {
    // ✅ El endpoint está en /auth/register/employee
    const response = await api.post('/auth/register/employee', data);
    return response.data;
  },

  /**
   * Actualizar empleado
   */
  async update(id: string, data: Partial<ParkingEmployee>): Promise<ParkingEmployee> {
    const response = await api.patch<ParkingEmployee>(`/parking-employees/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar empleado (desactivar)
   */
  async delete(id: string): Promise<void> {
  const token = localStorage.getItem('access_token');
  
  try {
    const response = await api.delete(`/parking-employees/${id}`);
    return response.data;
  } catch (error: any) {
    throw error;
  }
},
};