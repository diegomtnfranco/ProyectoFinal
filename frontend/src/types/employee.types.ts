import type { UserResponseDto } from './auth.types';

export interface RegisterEmployeeDto {
  email: string;
  password: string;
  name: string;
  parkingLotId: string;
  employeeCode?: string;
  position?: string;
}

export interface ParkingEmployee {
  id: string;
  userId: string;
  parkingLotId: string;
  name: string;
  employeeCode: string;
  position?: string;
  isActive: boolean;
  email?: string; // ← Agregar campo directo
  user?: UserResponseDto;
  createdAt: string;
}