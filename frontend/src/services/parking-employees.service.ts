import type {
  ParkingEmployee,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeParkingLotResponse,
} from '../types/parking.types';
import { api } from './api';



export const parkingEmployeesService = {
  /**
   * Crear empleado (dueño)
   */
  async create(data: CreateEmployeeDto): Promise<ParkingEmployee> {
    const response = await api.post<ParkingEmployee>('/parking-employees', data);
    return response.data;
  },

  /**
   * Obtener empleados de un estacionamiento (dueño)
   */
  async getByParkingLot(parkingLotId: string): Promise<ParkingEmployee[]> {
    const response = await api.get<ParkingEmployee[]>(`/parking-employees/parking-lot/${parkingLotId}`);
    return response.data;
  },

  /**
   * Obtener mi perfil (empleado)
   */
  async getMyProfile(): Promise<ParkingEmployee> {
    const response = await api.get<ParkingEmployee>('/parking-employees/me');
    return response.data;
  },

  /**
   * Obtener el estacionamiento donde trabajo (empleado)
   */
  async getMyParkingLot(): Promise<EmployeeParkingLotResponse> {
    const response = await api.get<EmployeeParkingLotResponse>('/parking-employees/my-parking-lot');
    return response.data;
  },

  /**
   * Obtener detalle de empleado (dueño/admin)
   */
  async getById(id: string): Promise<ParkingEmployee> {
    const response = await api.get<ParkingEmployee>(`/parking-employees/${id}`);
    return response.data;
  },

  /**
   * Actualizar empleado (dueño)
   */
  async update(id: string, data: UpdateEmployeeDto): Promise<ParkingEmployee> {
    const response = await api.patch<ParkingEmployee>(`/parking-employees/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar empleado (dueño)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/parking-employees/${id}`);
  },

  /**
   * Marcar entrada (empleado)
   */
  async clockIn(): Promise<{ message: string; clockTime: string }> {
    const response = await api.post('/parking-employees/clock-in');
    return response.data;
  },

  /**
   * Marcar salida (empleado)
   */
  async clockOut(): Promise<{ message: string; clockTime: string }> {
    const response = await api.post('/parking-employees/clock-out');
    return response.data;
  },
};