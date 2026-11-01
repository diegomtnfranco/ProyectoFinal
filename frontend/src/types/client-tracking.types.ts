import type { UserVehicleType } from './auth.types';
import type { ChargeBreakdown } from './occupancy-services.types';

export const MAX_CLIENT_VEHICLES = 3;

export interface ClientVehicle {
  id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  plate: string;
  vehicleType: UserVehicleType;
  isParked: boolean;
}

export interface ClientVehiclePayload {
  plate: string;
  vehicleType: UserVehicleType;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
}

export interface TrackedService {
  key: string;
  name: string;
  pricingType: string | null;
  amount: number | null;
  unit: string | null;
  status: 'selected' | 'performed' | 'not_performed' | string;
  estimatedSubtotal: number;
}

export interface Tracking {
  linkId: string;
  occupancyId: string;
  status: 'active' | 'finished';
  vehicle: { name: string | null; brand: string | null; model: string | null; plate: string; vehicleType: string };
  parkingLot: { id: string; name: string; address: string };
  checkInTime: string;
  checkOutTime: string | null;
  elapsedMinutes: number;
  currency: 'ARS';
  estimate: (ChargeBreakdown & { calculatedAt: string; isEstimate: true }) | null;
  finalAmount: number | null;
  nightPolicy: { mode: string; nightAmount: number | null; openTime: string; closeTime: string; toleranceMinutes: number } | null;
  services: TrackedService[];
}

export interface MyTracking {
  active: Tracking[];
  finished: Tracking[];
  limitNotices: { occupancyId: string; plate: string; parkingLotName: string; checkInTime: string }[];
  maxActive: number;
  refreshSeconds: number;
}

export interface TrackingEvent {
  eventId: string;
  type: 'checkin' | 'limit_reached' | 'closing_60' | 'closing_15' | 'night_started' | 'checkout';
  occupancyId: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
}
