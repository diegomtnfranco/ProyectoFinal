import type { ChargeBreakdown } from './occupancy-services.types';
import type { PaymentMethod, PaymentSummaryStatus } from './payments.types';

export type CheckoutRequestStatus = 'PENDING' | 'COMPLETED_PAID' | 'COMPLETED_UNPAID' | 'COMPLETED_WALLET' | 'CANCELLED';

export interface CashRequest {
  id: string;
  status: CheckoutRequestStatus;
  occupancyId: string;
  parkingLotId: string;
  vehiclePlate: string | null;
  quotedAmountCents: number;
  mine: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CashRequestDetail extends CashRequest {
  parkingLotName: string | null;
  spaceNumber: string | null;
  checkedOut: boolean;
  checkOutTime: string | null;
  finalAmountCents: number | null;
  payment: { status: PaymentSummaryStatus; method: PaymentMethod | null; amountCents: number | null } | null;
}

/** Vehículo del cliente identificado por el backend en una estadía activa */
export interface CheckoutMatch {
  occupancyId: string;
  vehiclePlate: string;
  vehicleType: string;
  vehicle: { id: string; name: string | null; brand: string | null; model: string | null } | null;
  space: { id: string; spaceNumber: string; floor: number | null };
  checkInTime: string;
  hoursToCharge: number;
  billedAmountCents: number;
  coveredAmountCents: number;
  amountCents: number;
  breakdown: ChargeBreakdown | null;
  cashRequest: CashRequest | null;
}

export interface QrCheckoutQuote {
  parkingLot: { id: string; name: string; address: string };
  matches: CheckoutMatch[];
  wallet: { balanceCents: number; currency: string };
  methods: {
    wallet: { enabled: boolean };
    mercadoPago: { enabled: boolean; comingSoon: boolean };
    cash: { enabled: boolean };
  };
}

export interface WalletCheckoutResult {
  status: 'PAID' | 'COVERED';
  replayed: boolean;
  occupancyId: string | null;
  vehiclePlate: string | null;
  amountCents: number;
  walletBalanceCents: number;
  checkOutTime: string | null;
  spaceNumber: string | null;
}

/** Cotización para el personal antes de confirmar el egreso */
export interface StaffCheckoutQuote extends CheckoutMatch {
  parkingLotId: string;
  clientName: string | null;
}

export interface PendingCashRequest {
  id: string;
  occupancyId: string;
  spaceId: string;
  spaceNumber: string;
  floor: number | null;
  vehiclePlate: string | null;
  vehicleType: string;
  clientName: string | null;
  quotedAmountCents: number;
  createdAt: string;
}

/** Vehículo del perfil ofrecido en el ingreso por QR */
export interface CheckInVehicleOption {
  id: string;
  plate: string;
  vehicleType: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  /** Estacionamiento donde ya tiene un ingreso activo */
  parkedAt: string | null;
  hasRate: boolean;
  pricePerHour: number | null;
  available: boolean;
}

export interface QrCheckInOptions {
  parkingLot: { id: string; name: string; address: string };
  vehicles: CheckInVehicleOption[];
}

export interface QrCheckInResult {
  success: boolean;
  message: string;
  spaceNumber: string;
  vehiclePlate: string;
  checkInTime: string;
  services?: { key: string; name: string }[];
  ignoredServiceKeys?: string[];
  vehicle: { id: string; plate: string; vehicleType: string; name: string | null; brand: string | null; model: string | null };
}

export const CHECKOUT_EVENTS = {
  CASH_REQUESTED: 'checkout:cash-requested',
  REQUEST_UPDATED: 'checkout:request-updated',
  STATUS: 'checkout:status',
} as const;
