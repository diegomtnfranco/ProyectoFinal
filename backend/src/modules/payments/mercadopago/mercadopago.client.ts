import { Injectable, Logger } from '@nestjs/common';
import { mercadoPagoConfig } from './mercadopago.config';

export interface MpPreferenceInput {
  paymentId: string;
  title: string;
  unitPrice: number;
  expiresAt: Date;
  backUrl: string;
  notificationUrl: string | null;
}

export interface MpPreference {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
}

/** Subconjunto del recurso /v1/payments que usa EstacionApp */
export interface MpPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  live_mode?: boolean;
  /** Id de la cuenta vendedora que cobró (se usa para reconocer la cuenta de prueba) */
  collector_id?: number | string | null;
  date_approved?: string | null;
}

export class MercadoPagoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Cliente HTTP mínimo para la API REST oficial (Checkout Pro).
 * Se usa fetch nativo de Node en lugar del SDK para no sumar dependencias:
 * solo se necesitan tres endpoints.
 */
@Injectable()
export class MercadoPagoClient {
  private readonly logger = new Logger(MercadoPagoClient.name);

  async createPreference(input: MpPreferenceInput): Promise<MpPreference> {
    const secureBackUrl = input.backUrl.startsWith('https://');
    const body: Record<string, unknown> = {
      items: [
        {
          id: input.paymentId,
          title: input.title.slice(0, 250),
          quantity: 1,
          currency_id: 'ARS',
          unit_price: input.unitPrice,
        },
      ],
      external_reference: input.paymentId,
      back_urls: { success: input.backUrl, failure: input.backUrl, pending: input.backUrl },
      // Mercado Pago solo acepta auto_return con una URL de retorno pública
      ...(secureBackUrl ? { auto_return: 'approved' } : {}),
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: input.expiresAt.toISOString(),
      statement_descriptor: 'ESTACIONAPP',
      metadata: { estacionapp_payment_id: input.paymentId },
    };
    if (input.notificationUrl) {
      const sep = input.notificationUrl.includes('?') ? '&' : '?';
      // source_news=webhooks: evita recibir además las notificaciones IPN (sin firma)
      body.notification_url = `${input.notificationUrl}${sep}source_news=webhooks`;
    }
    return this.request<MpPreference>('POST', '/checkout/preferences', body, input.paymentId);
  }

  async getPayment(mpPaymentId: string): Promise<MpPayment> {
    return this.request<MpPayment>('GET', `/v1/payments/${encodeURIComponent(mpPaymentId)}`);
  }

  async searchByExternalReference(externalReference: string): Promise<MpPayment[]> {
    const qs = new URLSearchParams({
      external_reference: externalReference,
      sort: 'date_created',
      criteria: 'desc',
      limit: '10',
    });
    const res = await this.request<{ results?: MpPayment[] }>('GET', `/v1/payments/search?${qs.toString()}`);
    return res.results ?? [];
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const cfg = mercadoPagoConfig();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

    let response: Response;
    try {
      response = await fetch(`${cfg.apiBaseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new MercadoPagoApiError(`No se pudo conectar con Mercado Pago: ${(err as Error).message}`, 0);
    }
    const text = await response.text();
    if (!response.ok) {
      // El cuerpo de error de MP no incluye credenciales; se recorta para el log
      this.logger.warn(`Mercado Pago ${method} ${path.split('?')[0]} -> ${response.status}: ${text.slice(0, 300)}`);
      throw new MercadoPagoApiError(`Mercado Pago respondió ${response.status}`, response.status);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }
}