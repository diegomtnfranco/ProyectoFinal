// ============================================
// ENUMS
// ============================================

export const UserRole = {
  CLIENT : 'client',
  PARKING_OWNER : 'parking_owner',
  PARKING_EMPLOYEE : 'parking_employee',
  ADMIN : 'admin',
} as const 

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const VehicleType = {
  CAR : 'car',
  TRUCK : 'truck',
  MOTORCYCLE : 'motorcycle',
  VAN : 'van',
} as const 
export type UserVehicleType = typeof VehicleType[keyof typeof VehicleType];

export const SpaceStatus = {
  AVAILABLE : 'available',
  RESERVED : 'reserved',
  OCCUPIED : 'occupied',
  MAINTENANCE : 'maintenance',
} as const 

export type SpaceStatusType = typeof SpaceStatus[keyof typeof SpaceStatus];

export const ReservationStatus = {
  PENDING_PAYMENT : 'pending_payment',
  PENDING_CONFIRMATION : 'pending_confirmation',
  CONFIRMED : 'confirmed',
  CANCELLED_BY_CLIENT : 'cancelled_by_client',
  CANCELLED_BY_PARKING : 'cancelled_by_parking',
  EXPIRED : 'expired',
  COMPLETED : 'completed',
} as const 
export type ReservationStatusType = typeof ReservationStatus[keyof typeof ReservationStatus];
// ============================================
// AUTH - DTOs
// ============================================

// Login
export interface LoginDto {
  email: string;
  password: string;
}

// Register Client
export interface RegisterClientDto {
  email: string;
  password: string;
  confirmPassword: string; // ← Agregar esto
  name: string;
  phone?: string;
  defaultVehiclePlate?: string;
  defaultVehicleType?: UserVehicleType;
}

// Register Owner (completo con estacionamiento)
export interface RegisterOwnerCompleteDto {
  // Datos del usuario
  email: string;
  password: string;
  confirmPassword: string; // ← Agregar esto
  // Datos del dueño
  name: string;
  businessName: string;
  cuit?: string;
  phone?: string;
  address?: string;
  
  // Datos del estacionamiento
  parkingName?: string;
  latitude: number;
  longitude: number;
  openTime: string;
  closeTime: string;
  totalSpaces: number;
  allowOnlineReservations?: boolean;
}

// Register Employee
export interface RegisterEmployeeDto {
  email: string;
  password: string;
  name: string;
  parkingLotId: string;
  employeeCode?: string;
  position?: string;
}

// Update Profile
export interface UpdateProfileDto {
  user?: {
    email?: string;
    password?: string;
    avatarUrl?: string;
  };
  client?: {
    name?: string;
    phone?: string;
    defaultVehiclePlate?: string;
    defaultVehicleType?: UserVehicleType;
  };
  owner?: {
    businessName?: string;
    phone?: string;
    address?: string;
  };
}

// Verify Email
export interface VerifyEmailDto {
  token: string;
}

// Resend Verification
export interface ResendVerificationDto {
  email: string;
}

// ============================================
// AUTH - RESPONSES
// ============================================

// User response (dentro de login y profile)
export interface UserResponseDto {
  id: string;
  email: string;
  role: UserRoleType;
  isVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
}

// Perfil de cliente
export interface ClientProfileResponseDto {
  id: string;
  name: string;
  phone: string;
  defaultVehiclePlate?: string;
  defaultVehicleType?: UserVehicleType;
}

// Perfil de dueño
export interface OwnerProfileResponseDto {
  id: string;
  businessName: string;
  cuit?: string;
  phone?: string;
  address?: string;
  isApproved: boolean;
}

// Perfil de empleado
export interface EmployeeProfileResponseDto {
  id: string;
  name: string;
  employeeCode?: string;
  position?: string;
  isActive: boolean;
  parkingLotId: string;
  parkingLotName: string;
}

// Profile completo (GET /auth/profile)
export interface ProfileResponseDto {
  user: UserResponseDto;
  clientProfile?: ClientProfileResponseDto;
  parkingOwnerProfile?: OwnerProfileResponseDto;
  employeeProfile?: EmployeeProfileResponseDto;
}

// Login response
export interface LoginResponseDto {
  user: UserResponseDto;
  access_token: string;
  requiresVerification?: boolean;
  requiresApproval?: boolean;
  message?: string;  // ← Este campo existe en registerClient
}

// Register Owner Complete response
export interface RegisterOwnerCompleteResponseDto {
  user: UserResponseDto;
  access_token: string;
  parkingLot: {
    id: string;
    name: string;
    totalSpaces: number;
    spacesRange: {
      from: string;
      to: string;
    };
  };
  requiresVerification: boolean;
  requiresApproval: boolean;
  message: string;
}

// Register Employee response
export interface RegisterEmployeeResponseDto {
  user: UserResponseDto;
  message: string;
}

// Verify email response
export interface VerifyEmailResponseDto {
  message: string;
}
