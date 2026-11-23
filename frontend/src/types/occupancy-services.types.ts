import type { Pricing } from './parking-profile.types';

export const NightRateMode = {
  HOURLY: 'hourly',
  SPECIAL: 'special',
} as const;
export type NightRateModeValue = typeof NightRateMode[keyof typeof NightRateMode];

export interface NightPolicy {
  parkingLotId: string;
  mode: NightRateModeValue;
  nightAmount: number | null;
  toleranceMinutes: number;
  openTime: string;
  closeTime: string;
  isOpen24h: boolean;
  updatedAt: string | null;
}

export interface OfferedService {
  key: string;
  source: 'catalog' | 'custom';
  name: string;
  description: string | null;
  conditions: string | null;
  pricing: Pricing;
}

export interface SelectedService {
  key: string;
  name: string;
  pricing: Pricing | null;
  selectedVia: string;
  selectedAt: string;
  noLongerOffered: boolean;
  /** selected | performed | not_performed */
  status: ServiceExecutionStatus;
}

export type ServiceExecutionStatus = 'selected' | 'performed' | 'not_performed';

export interface OccupancyServices {
  occupancyId: string;
  spaceId: string;
  spaceNumber: string | null;
  vehiclePlate: string | null;
  offered: OfferedService[];
  selected: SelectedService[];
}

export interface ServiceChargeLine {
  key: string;
  name: string;
  pricingType: string | null;
  unit: string | null;
  unitPrice: number | null;
  quantity: number;
  subtotal: number;
  status?: string;
}

/** Desglose devuelto por el backend en el egreso (fuente de verdad del importe) */
export interface ChargeBreakdown {
  mode: NightRateModeValue;
  totalMinutes: number;
  hourlyHours: number;
  pricePerHour: number;
  hourlyAmount: number;
  nights: number;
  nightAmountPerNight: number | null;
  nightAmount: number;
  parkingAmount: number;
  parkingSource: 'calculated' | 'reservation';
  services: ServiceChargeLine[];
  servicesAmount: number;
  total: number;
}
