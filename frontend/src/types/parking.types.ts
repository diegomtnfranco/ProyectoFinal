import {  type SpaceStatusType, type UserVehicleType, type ReservationStatusType } from './auth.types';
// ============================================
// PARKING LOT
// ============================================

export interface ParkingLotSettings {
  allowOnlineReservations: boolean;
  cancellationMinutesBefore: number;
  reservationHoldMinutes: number;
  maxReservationHours?: number;
}

export interface CreateParkingLotDto {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openTime: string;
  closeTime: string;
  settings?: Partial<ParkingLotSettings>;
}

export interface UpdateParkingLotDto extends Partial<CreateParkingLotDto> {
  isActive?: boolean;
}

export interface NearbyQueryDto {
  lat: number;
  lng: number;
  radius?: number;
}

// ============================================
// SPACE
// ============================================

export interface SpaceMetadata {
  widthMeters?: number;
  lengthMeters?: number;
  hasEvCharger?: boolean;
  isCovered?: boolean;
  floor?: number;
  zone?: string;
}

export interface Space {
  id: string;
  spaceNumber: string;
  status: SpaceStatusType;
  allowReservations:boolean;
  allowedVehicleTypes: UserVehicleType[];
  isReserved: boolean;
  reservedUntil?: string;
  occupiedSince?: string;
  occupiedByVehiclePlate?: string;
  occupiedByVehicleType?: UserVehicleType;
  metadata?: SpaceMetadata;
  parkingLotId?: string;
}

export interface CreateSpaceDto {
  parkingLotId: string;
  spaceNumber: string;
  allowedVehicleTypes: UserVehicleType[];
  status?: SpaceStatusType;
  metadata?: SpaceMetadata;
}

export interface UpdateSpaceDto extends Partial<CreateSpaceDto> {
  status?: SpaceStatusType;
}

export interface UpdateSpaceStatusDto {
  status: SpaceStatusType;
}

// ============================================
// RATE
// ============================================

export interface Rate {
  id: string;
  parkingLotId: string;
  vehicleType: UserVehicleType;
  pricePerHour: number;
  rateType: 'hourly' | 'daily' | 'weekly';
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRateDto {
  parkingLotId: string;
  vehicleType: UserVehicleType;
  pricePerHour: number;
  rateType?: 'hourly' | 'daily' | 'weekly';
  startTime?: string;
  endTime?: string;
}

export interface UpdateRateDto extends Partial<CreateRateDto> {
  isActive?: boolean;
}

export interface ApplicableRateQueryDto {
  parkingLotId: string;
  vehicleType: UserVehicleType;
  dateTime: string;
}

// ============================================
// RESERVATION
// ============================================

export interface Reservation {
  id: string;
  spaceId: string;
  spaceNumber: string;
  parkingLotId: string;
  parkingLotName: string;
  vehicleType: UserVehicleType;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  status: ReservationStatusType;
  totalAmount?: number;
  createdAt: string;
  clientName?: string;  // ← Agregar (opcional, para mostrar en UI)
  expiresAt?: string;   // ← Agregar (para saber si expira pronto)
  avatarUrl?:string;
}

export interface CreateReservationDto {
  parkingLotId: string;
  vehicleType: UserVehicleType;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
}

export interface UpdateReservationDto {
  status?: ReservationStatusType;
  cancellationReason?: string;
}

export interface FilterReservationsDto {
  clientId?: string;
  spaceId?: string;
  status?: ReservationStatusType;
  vehicleType?: UserVehicleType;
  startDate?: string;
  endDate?: string;
}

// ============================================
// OCCUPANCY
// ============================================

// export interface Occupancy {
//   id: string;
//   spaceId: string;
//   spaceNumber: string;
//   vehiclePlate: string;
//   vehicleType: UserVehicleType;
//   checkInTime: string;
//   checkOutTime?: string;
//   checkedInBy: string;
//   checkedOutBy?: string;
//   totalAmount?: number;
//   isCompleted: boolean;
//   reservationId?: string;  // ← AGREGO
// }

export interface CheckInDto {
  spaceId: string;
  vehiclePlate: string;
  vehicleType: UserVehicleType;
  reservationId?: string;
}

export interface CheckOutDto {
  spaceId: string;
}

export interface ActiveOccupancy {
  id: string;
  spaceId: string;
  space: {
    id: string;
    spaceNumber: string;
    status: SpaceStatusType;
  };
  vehiclePlate: string;
  vehicleType: UserVehicleType;
  checkInTime: string;
  checkedInBy: string;
  totalAmount?: number;
  isCompleted?: boolean;  // ← AGREGO
  hasReservation: boolean;   // ← AGREGO
  reservationId?: string;    // ← AGREGO
}

// ============================================
// PARKING EMPLOYEE
// ============================================

export interface ParkingEmployee {
  id: string;
  userId: string;
  parkingLotId: string;
  name: string;
  employeeCode: string;
  position?: string;
  isActive: boolean;
  parkingLot?: {
    id: string;
    name: string;
  };
}

export interface CreateEmployeeDto {
  email: string;
  password: string;
  name: string;
  parkingLotId: string;
  employeeCode?: string;
  position?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  position?: string;
  isActive?: boolean;
  employeeCode?: string;
}

export interface EmployeeParkingLotResponse {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openTime: string;
  closeTime: string;
  stats: {
    totalSpaces: number;
    availableSpaces: number;
    occupiedSpaces: number;
    reservedSpaces: number;
    maintenanceSpaces: number;
  };
  spaces: Array<{
    id: string;
    spaceNumber: string;
    status: SpaceStatusType;
    allowedVehicleTypes: UserVehicleType[];
    isReserved: boolean;
    reservedUntil?: string;
    occupiedSince?: string;
    occupiedByVehiclePlate?: string;
    metadata?: SpaceMetadata;
  }>;
}


// ParkingLot (sin stats - para búsqueda cercana)
export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openTime: string;
  closeTime: string;
  settings: ParkingLotSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ParkingLotWithStats (con stats - para dashboard del dueño)
export interface ParkingLotWithStats extends ParkingLot {
  stats: {
    totalSpaces: number;
    availableSpaces: number;
    occupiedSpaces: number;
    reservedSpaces: number;
    maintenanceSpaces: number;
  };
  spaces?: Space[];
  rates?: Rate[];
}

// // Occupancy (respuesta completa del servicio)
// export interface Occupancy {
//   id: string;
//   spaceId: string;
//   vehiclePlate: string;
//   vehicleType: UserVehicleType;
//   checkInTime: string;
//   checkOutTime?: string;
//   checkedInBy: string;
//   checkedOutBy?: string;
//   totalAmount?: number;
//   isCompleted: boolean;
// }

// ActiveOccupancy (para mostrar en UI - tiene información del espacio)
export interface ActiveOccupancy {
  id: string;
  spaceId: string;
  space: {
    id: string;
    spaceNumber: string;
    status: SpaceStatusType;
  };
  vehiclePlate: string;
  vehicleType: UserVehicleType;
  checkInTime: string;
  checkedInBy: string;
  totalAmount?: number;
}

export interface ParkingLotNearbyResponseDto {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;



  openTime: string;
  closeTime: string;

  rates:{
  id: string;
  vehicleType: UserVehicleType;
  price: number;
  }[];

  availability: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  };

  imageUrl?: string;
}


// ✅ ACTUALIZAR Occupancy (unificar las dos definiciones)
export interface Occupancy {
  id: string;
  spaceId: string;
  reservationId?: string;
  vehiclePlate: string;
  vehicleType: UserVehicleType;
  checkInTime: string;
  checkOutTime?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
  totalAmount?: number;
  isCompleted: boolean;
  isAnonymous?: boolean;
  checkedInViaQr?: boolean;
  checkedOutViaQr?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Relaciones
  space?: {
    id: string;
    spaceNumber: string;
    parkingLot?: {
      id: string;
      name: string;
      address: string;
      phone?: string;
    };
  };
  reservation?: {
    id: string;
    vehiclePlate?: string;
    client?: {
      name?: string;
    };
  };
}

export interface CheckOutResponseDto{
  occupancy: Occupancy;
  rate:{
    id: string;
    vehicleType: UserVehicleType;
    pricePerHour: number;
  }
}

// ✅ AGREGAR respuesta para checkout anónimo
export interface AnonymousCheckOutResponse {
  success: boolean;
  message: string;
  spaceNumber: string;
  vehiclePlate: string;
  totalAmount: number;
  hours: number;
  checkInTime: string;
  checkOutTime: string;
  parkingLot: {
    id: string;
    name: string;
    address: string;
    phone?: string;
  };
  rate:{
    id: string;
    vehicleType: UserVehicleType;
    pricePerHour: number;
  }
}

// ✅ AGREGAR respuesta para check-in anónimo
export interface AnonymousCheckInResponse {
  success: boolean;
  message: string;
  spaceNumber: string;
  vehiclePlate: string;
  checkInTime: string;
}