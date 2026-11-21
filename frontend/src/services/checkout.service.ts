import type { AxiosRequestConfig } from 'axios';
import { api } from './api';
import { PaymentApiError } from '../types/payments.types';
import type {
  CashRequest,
  QrCheckInOptions,
  QrCheckInResult,
  CashRequestDetail,
  PendingCashRequest,
  QrCheckoutQuote,
  StaffCheckoutQuote,
  WalletCheckoutResult,
} from '../types/checkout.types';

/**
 * Igual que payments.service: las respuestas 4xx se leen acá para conservar el
 * código del backend (AMOUNT_CHANGED, INSUFFICIENT_FUNDS, ...) sin tocar el
 * interceptor global de `api`.
 */
async function call<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<T>({ ...config, validateStatus: (s) => s < 500 });
  if (response.status >= 400) {
    throw new PaymentApiError(response.status, (response.data ?? {}) as Record<string, unknown>);
  }
  return response.data;
}

export const checkoutService = {
  /** Ingreso por QR: solo los vehículos del perfil del cliente */
  checkInOptions: (token: string) =>
    call<QrCheckInOptions>({ method: 'GET', url: '/occupancy/qr/check-in/vehicles', params: { token } }),

  checkIn: (token: string, vehicleId: string, serviceKeys: string[]) =>
    call<QrCheckInResult>({
      method: 'POST',
      url: '/occupancy/qr/check-in',
      data: { token, vehicleId, ...(serviceKeys.length ? { serviceKeys } : {}) },
    }),

  /** El backend identifica los vehículos del perfil estacionados en el lugar del QR */
  quote: (token: string) => call<QrCheckoutQuote>({ method: 'GET', url: '/occupancy/qr/checkout', params: { token } }),

  payWithWallet: (token: string, occupancyId: string, expectedAmountCents: number, idempotencyKey: string) =>
    call<WalletCheckoutResult>({
      method: 'POST',
      url: '/occupancy/qr/checkout/wallet',
      data: { token, occupancyId, expectedAmountCents },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  requestCash: (token: string, occupancyId: string) =>
    call<CashRequest>({ method: 'POST', url: '/occupancy/qr/checkout/cash', data: { token, occupancyId } }),

  getRequest: (id: string) => call<CashRequestDetail>({ method: 'GET', url: `/occupancy/checkout-requests/${id}` }),

  cancelRequest: (id: string) => call<CashRequestDetail>({ method: 'POST', url: `/occupancy/checkout-requests/${id}/cancel` }),

  // ------------------------------------------------------------ dueño / empleado
  staffQuote: (spaceId: string) => call<StaffCheckoutQuote>({ method: 'GET', url: `/occupancy/checkout-quote/${spaceId}` }),

  pendingForLot: (parkingLotId: string) =>
    call<PendingCashRequest[]>({ method: 'GET', url: `/occupancy/checkout-requests/active/${parkingLotId}` }),
};
