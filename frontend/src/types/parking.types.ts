export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  rating?: number;
  pricingSummary: string;
  amenities?: string[];
  contactPhone?: string;
  isOpen?: boolean;
}

export const SpaceStatus = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance'
} as const;

export type SpaceStatus = typeof SpaceStatus[keyof typeof SpaceStatus];
export const VehicleType = {
  CAR : 'car',
  TRUCK : 'truck',
  MOTORCYCLE : 'motorcycle',
  VAN : 'van'
} as const;

export type VehicleType = typeof VehicleType[keyof typeof VehicleType];

export interface Space {
  id: string;
  spaceNumber: string;
  status: SpaceStatus;
  allowsReservations: boolean;
  isReserved: boolean;
  occupiedByvehicleType?: VehicleType;
  occupiedSince?:Date;
  pricePerHour?: number;
} 

export const RateType = {
  HOURLY : 'hourly',
  DAILY : 'daily',
  WEEKLY : 'weekly',
} as const;

export type RateType = typeof RateType[keyof typeof RateType];

export interface Rate {
  id: string;  
  vehicleType: VehicleType;
  pricePerHour: number; 
  rateType: RateType;
  isActive: boolean;
}
