import type { ChargeBreakdown } from '../../occupancy-services/charge-calculator';
import type { TrackingEventType } from '../entities/client-tracking-event.entity';

export interface TrackedServiceView {
  key: string;
  name: string;
  pricingType: string | null;
  amount: number | null;
  unit: string | null;
  status: string;
  /** Importe estimado de este servicio (0 si incluido, gratuito o no realizado) */
  estimatedSubtotal: number;
}

export interface TrackingView {
  linkId: string;
  occupancyId: string;
  status: 'active' | 'finished';
  vehicle: {
    name: string | null;
    brand: string | null;
    model: string | null;
    plate: string;
    vehicleType: string;
  };
  parkingLot: { id: string; name: string; address: string };
  checkInTime: Date;
  checkOutTime: Date | null;
  elapsedMinutes: number;
  currency: 'ARS';
  /** Estimado al momento de la consulta (solo ingresos activos) */
  estimate: (ChargeBreakdown & { calculatedAt: Date; isEstimate: true }) | null;
  /** Importe definitivo registrado por el egreso (solo finalizados) */
  finalAmount: number | null;
  nightPolicy: {
    mode: string;
    nightAmount: number | null;
    openTime: string;
    closeTime: string;
    toleranceMinutes: number;
  } | null;
  services: TrackedServiceView[];
}

export interface LimitNoticeView {
  occupancyId: string;
  plate: string;
  parkingLotName: string;
  checkInTime: Date;
}

export interface MyTrackingResponse {
  active: TrackingView[];
  finished: TrackingView[];
  limitNotices: LimitNoticeView[];
  maxActive: number;
  refreshSeconds: number;
}

export interface TrackingEventView {
  eventId: string;
  type: TrackingEventType;
  occupancyId: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: Date;
}
