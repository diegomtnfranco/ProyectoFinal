import type { AxiosRequestConfig } from 'axios';
import { api } from './api';
import {
  PaymentApiError,
  type FinanceGranularity,
  type FinancePayment,
  type FinanceSeries,
  type FinanceSummary,
  type ObligationType,
  type Page,
  type PayableItem,
  type Payment,
  type PaymentsConfig,
  type PaymentSummary,
  type Wallet,
  type WalletTransaction,
} from '../types/payments.types';

/**
 * El interceptor global de `api` reduce los errores a un texto. Para pagos se
 * necesita el código (p. ej. INSUFFICIENT_FUNDS), así que las respuestas 4xx se
 * leen acá directamente sin modificar el interceptor compartido.
 */
async function call<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<T>({ ...config, validateStatus: (s) => s < 500 });
  if (response.status >= 400) {
    throw new PaymentApiError(response.status, (response.data ?? {}) as Record<string, unknown>);
  }
  return response.data;
}

/** Clave para reintentos seguros (el backend no repite el débito ni la carga) */
export const newIdempotencyKey = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

export const walletService = {
  getMine: () => call<Wallet>({ method: 'GET', url: '/wallet/me' }),

  transactions: (page = 1, limit = 10) =>
    call<Page<WalletTransaction>>({ method: 'GET', url: '/wallet/me/transactions', params: { page, limit } }),

  topUp: (amountCents: number, idempotencyKey: string) =>
    call<{ wallet: Wallet; transaction: WalletTransaction; replayed: boolean }>({
      method: 'POST',
      url: '/wallet/me/top-ups',
      data: { amountCents },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};

export const paymentsService = {
  config: () => call<PaymentsConfig>({ method: 'GET', url: '/payments/config' }),

  listMine: (page = 1, limit = 10) => call<Page<Payment>>({ method: 'GET', url: '/payments/me', params: { page, limit } }),

  getMine: (id: string) => call<Payment>({ method: 'GET', url: `/payments/me/${id}` }),

  payable: () => call<PayableItem[]>({ method: 'GET', url: '/payments/me/payable' }),

  payWithWallet: (obligationType: ObligationType, obligationId: string, idempotencyKey: string) =>
    call<{ payment: Payment; walletBalanceCents: number; replayed: boolean }>({
      method: 'POST',
      url: '/payments/wallet',
      data: { obligationType, obligationId },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  startMercadoPago: (obligationType: ObligationType, obligationId: string) =>
    call<{ paymentId: string; redirectUrl: string; expiresAt: string | null; reused: boolean }>({
      method: 'POST',
      url: '/payments/mercadopago',
      data: { obligationType, obligationId },
    }),

  /** Le pide al backend que consulte a Mercado Pago (la URL de retorno no confirma nada) */
  sync: (id: string) => call<Payment>({ method: 'POST', url: `/payments/${id}/sync` }),

  cancel: (id: string) => call<Payment>({ method: 'POST', url: `/payments/${id}/cancel` }),

  // ------------------------------------------------------------ dueño / empleado
  staffStatus: (parkingLotId: string, params: { occupancyId?: string; reservationId?: string }) =>
    call<PaymentSummary>({ method: 'GET', url: `/payments/staff/parking-lot/${parkingLotId}/status`, params }),

  registerPresential: (obligationType: ObligationType, obligationId: string) =>
    call<Payment>({ method: 'POST', url: '/payments/staff/presential', data: { obligationType, obligationId } }),
};

export const financeService = {
  lots: () => call<{ id: string; name: string }[]>({ method: 'GET', url: '/finance/parking-lots' }),

  summary: (parkingLotId?: string) =>
    call<FinanceSummary>({ method: 'GET', url: '/finance/summary', params: { parkingLotId: parkingLotId || undefined } }),

  series: (granularity: FinanceGranularity, parkingLotId?: string) =>
    call<FinanceSeries>({
      method: 'GET',
      url: '/finance/series',
      params: { granularity, parkingLotId: parkingLotId || undefined },
    }),

  payments: (params: { parkingLotId?: string; status?: string; page?: number; limit?: number }) =>
    call<Page<FinancePayment>>({
      method: 'GET',
      url: '/finance/payments',
      params: { ...params, parkingLotId: params.parkingLotId || undefined, status: params.status || undefined },
    }),
};
