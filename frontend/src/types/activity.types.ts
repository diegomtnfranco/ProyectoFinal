import type { UserVehicleType } from './auth.types';

export const ActivityType = {
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out',
  RESERVATION: 'reservation',
  RATE_CHANGE: 'rate_change',
} as const;
export type ActivityTypeValue = typeof ActivityType[keyof typeof ActivityType];

export type ActivityEntryMethod = 'manual' | 'qr' | 'reservation';
export type ActivityExitMethod = 'manual' | 'qr';

/** Alta, edición o baja de una tarifa (solo type === 'rate_change') */
export interface RateChangeInfo {
  action: 'created' | 'updated' | 'deleted';
  previousPricePerHour: number | null;
  newPricePerHour: number | null;
  changedByName: string | null;
  changedByEmail: string | null;
}

export interface ActivityItem {
  id: string;
  type: ActivityTypeValue;
  sourceId: string;
  occurredAt: string;
  vehiclePlate: string;
  vehicleType: UserVehicleType;
  spaceNumber?: string;
  /** Ingreso real (ocupación) o previsto (reserva) */
  checkInTime: string | null;
  /** Egreso real (ocupación) o previsto (reserva) */
  checkOutTime: string | null;
  totalAmount: number | null;
  /** true cuando el vehículo sigue adentro y el total se calcula al momento */
  isEstimated: boolean;
  entryMethod: ActivityEntryMethod;
  exitMethod: ActivityExitMethod | null;
  hasReservation: boolean;
  reservationStatus?: string;
  rateChange?: RateChangeInfo;
}

export interface PaginatedActivity {
  items: ActivityItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
