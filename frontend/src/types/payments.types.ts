// Billetera demo + pagos (wallet, Mercado Pago Sandbox, presencial).
// Todos los importes llegan del backend en centavos enteros.

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
/** NONE = sin pago registrado; COVERED = cubierto por el pago de la reserva */
export type PaymentSummaryStatus = PaymentStatus | 'NONE' | 'COVERED';
export type PaymentMethod = 'WALLET' | 'MERCADO_PAGO' | 'PRESENTIAL';
export type ObligationType = 'RESERVATION' | 'OCCUPANCY';

export interface Wallet {
  id: string;
  balanceCents: number;
  currency: string;
  totalLoadedCents: number;
  totalSpentCents: number;
  createdAt: string;
  isDemo: true;
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  kind: 'DEMO_TOPUP' | 'PAYMENT';
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  paymentId: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface Payment {
  id: string;
  obligationType: ObligationType;
  reservationId: string | null;
  occupancyId: string | null;
  parkingLotId: string;
  parkingLotName: string | null;
  vehiclePlate: string | null;
  concept: string;
  billedAmountCents: number;
  coveredAmountCents: number;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  statusDetail: string | null;
  externalPaymentId: string | null;
  expiresAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayableItem {
  obligationType: ObligationType;
  obligationId: string;
  parkingLotId: string;
  parkingLotName: string;
  vehiclePlate: string | null;
  concept: string;
  billedAmountCents: number;
  coveredAmountCents: number;
  amountCents: number;
  date: string;
  pendingPayment: { id: string; method: PaymentMethod; expiresAt: string | null } | null;
}

export interface PaymentSummary {
  status: PaymentSummaryStatus;
  method: PaymentMethod | null;
  amountCents: number | null;
  billedAmountCents: number | null;
  coveredAmountCents: number;
  paymentId: string | null;
  updatedAt: string | null;
}

export interface PaymentsConfig {
  mercadoPagoEnabled: boolean;
  sandbox: boolean;
  currency: string;
}

export interface FinanceSummary {
  parkingLotId: string | null;
  currency: string;
  incomeTodayCents: number;
  incomeWeekCents: number;
  incomeLast30DaysCents: number;
  incomeTotalCents: number;
  counts: { approved: number; pending: number; rejected: number; cancelled: number };
  byMethodCents: { wallet: number; mercadoPago: number; presential: number };
}

export type FinanceGranularity = 'day' | 'week' | 'month';

export interface FinanceSeries {
  granularity: FinanceGranularity;
  currency: string;
  points: { period: string; amountCents: number; count: number }[];
}

export interface FinancePayment {
  id: string;
  createdAt: string;
  approvedAt: string | null;
  vehiclePlate: string | null;
  clientName: string | null;
  clientEmail: string | null;
  parkingLotId: string;
  parkingLotName: string;
  obligationType: ObligationType;
  concept: string;
  amountCents: number;
  billedAmountCents: number;
  coveredAmountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
}

/** Error de la API de pagos con el código estable que envía el backend */
export class PaymentApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly data: Record<string, unknown>;
  constructor(status: number, data: Record<string, unknown>) {
    const raw = data?.message;
    super(Array.isArray(raw) ? raw.join('. ') : String(raw ?? 'No se pudo completar la operación'));
    this.status = status;
    this.code = typeof data?.code === 'string' ? data.code : undefined;
    this.data = data ?? {};
  }
}
