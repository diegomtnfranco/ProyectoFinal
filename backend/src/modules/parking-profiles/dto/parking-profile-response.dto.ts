import { PriceUnit, PricingType } from '../parking-profiles.constants';

export interface PricingView {
  type: PricingType;
  amount: number | null;
  unit: PriceUnit | null;
  currency: string;
}

export interface FeatureView {
  code: string;
  name: string;
  catalogDescription: string | null;
  enabled: boolean;
  notes: string | null;
}

export interface CatalogServiceView extends FeatureView {
  conditions: string | null;
  pricing: PricingView | null;
}

export interface CustomServiceView {
  id: string;
  title: string;
  description: string | null;
  conditions: string | null;
  isActive: boolean;
  pricing: PricingView | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Vista del dueño: catálogo completo con su estado */
export interface ParkingProfileAdminView {
  parkingLotId: string;
  parkingLotName: string;
  /** Solo lectura: proviene de parking_lots.address */
  address: string;
  description: string | null;
  physicalFeatures: FeatureView[];
  services: CatalogServiceView[];
  customServices: CustomServiceView[];
}

export interface PublicServiceView {
  source: 'catalog' | 'custom';
  key: string;
  name: string;
  description: string | null;
  conditions: string | null;
  pricing: PricingView;
}

/** Vista pública: solo lo activo, sin datos internos */
export interface ParkingProfilePublicView {
  parkingLotId: string;
  address: string;
  description: string | null;
  physicalFeatures: { code: string; name: string; notes: string | null }[];
  services: PublicServiceView[];
  hasDetails: boolean;
}
