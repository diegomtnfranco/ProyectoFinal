import type { UserVehicleType, SpaceStatusType } from './auth.types';

// ============================================
// ADMIN - PARKING LOT TYPES
// ============================================

export interface AdminParkingLotSettings {
  allowOnlineReservations: boolean;
  cancellationMinutesBefore: number;
  reservationHoldMinutes: number;
  maxReservationHours?: number;
  maxAdvanceDays?: number;
  blockSpaceHoursBefore?: number;
}

export interface AdminParkingLotOwner {
  id: string;
  userId?: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  isApproved?: boolean;
}

export interface AdminParkingLotStats {
  totalSpaces: number;
  availableSpaces: number;
  occupiedSpaces: number;
  reservedSpaces: number;
  maintenanceSpaces: number;
}

export interface AdminParkingLot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openTime: string;
  closeTime: string;
  settings: AdminParkingLotSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: AdminParkingLotOwner;
  stats?: AdminParkingLotStats;
  imageUrl?: string;
}

// ============================================
// ADMIN - SPACE TYPES
// ============================================

export interface AdminSpace {
  id: string;
  spaceNumber: string;
  status: SpaceStatusType;
  allowedVehicleTypes: UserVehicleType[];
  isReserved: boolean;
  reservedUntil?: string;
  occupiedSince?: string;
  occupiedByVehiclePlate?: string;
  occupiedByVehicleType?: UserVehicleType;
  metadata?: {
    floor?: number;
    zone?: string;
    widthMeters?: number;
    lengthMeters?: number;
    hasEvCharger?: boolean;
    isCovered?: boolean;
  };
}

// ============================================
// ADMIN - RATE TYPES
// ============================================

export interface AdminRate {
  id: string;
  vehicleType: UserVehicleType;
  pricePerHour: number;
  rateType: 'hourly' | 'daily' | 'weekly';
  startTime?: string;
  endTime?: string;
  isActive: boolean;
}

// ============================================
// ADMIN - RESPONSE TYPES
// ============================================

export interface AdminParkingLotDetailResponse extends AdminParkingLot {
  spaces: AdminSpace[];
  rates: AdminRate[];
}

export interface AdminToggleStatusResponse {
  id: string;
  isActive: boolean;
  message: string;
}

// ============================================
// ADMIN - QUERY PARAMS
// ============================================

export interface AdminParkingLotsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}