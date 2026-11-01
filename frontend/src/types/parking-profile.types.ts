export const PricingType = {
  INCLUDED: 'included',
  FREE: 'free',
  EXTRA_COST: 'extra_cost',
} as const;
export type PricingTypeValue = typeof PricingType[keyof typeof PricingType];

export const PriceUnit = {
  PER_VEHICLE: 'per_vehicle',
  PER_USE: 'per_use',
  PER_HOUR: 'per_hour',
  FIXED: 'fixed',
} as const;
export type PriceUnitValue = typeof PriceUnit[keyof typeof PriceUnit];

export interface Pricing {
  type: PricingTypeValue;
  amount: number | null;
  unit: PriceUnitValue | null;
  currency: string;
}

export interface PricingInput {
  type: PricingTypeValue;
  amount?: number | null;
  unit?: PriceUnitValue | null;
}

export interface FeatureOption {
  code: string;
  name: string;
  catalogDescription: string | null;
  enabled: boolean;
  notes: string | null;
}

export interface CatalogServiceOption extends FeatureOption {
  conditions: string | null;
  pricing: Pricing | null;
}

export interface CustomService {
  id: string;
  title: string;
  description: string | null;
  conditions: string | null;
  isActive: boolean;
  pricing: Pricing | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingProfileAdmin {
  parkingLotId: string;
  parkingLotName: string;
  address: string;
  description: string | null;
  physicalFeatures: FeatureOption[];
  services: CatalogServiceOption[];
  customServices: CustomService[];
}

export interface UpdateParkingProfilePayload {
  description?: string | null;
  physicalFeatures?: { code: string; enabled: boolean; notes?: string | null }[];
  services?: { code: string; enabled: boolean; notes?: string | null; conditions?: string | null; pricing?: PricingInput | null }[];
}

export interface CustomServicePayload {
  title: string;
  description?: string | null;
  conditions?: string | null;
  isActive?: boolean;
  pricing: PricingInput;
}

export interface PublicService {
  source: 'catalog' | 'custom';
  key: string;
  name: string;
  description: string | null;
  conditions: string | null;
  pricing: Pricing;
}

export interface ParkingProfilePublic {
  parkingLotId: string;
  address: string;
  description: string | null;
  physicalFeatures: { code: string; name: string; notes: string | null }[];
  services: PublicService[];
  hasDetails: boolean;
}
