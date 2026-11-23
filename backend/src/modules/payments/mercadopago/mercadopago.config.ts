/**
 * Configuración de Mercado Pago. Solo se lee en el backend: el access token y
 * la clave de webhooks nunca se envían al frontend.
 *
 * La integración funciona exclusivamente en modo Sandbox (dinero ficticio):
 * si MP_SANDBOX no es "true", los pagos con Mercado Pago quedan deshabilitados.
 */
export interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
  notificationUrl: string;
  frontendUrl: string;
  ttlMinutes: number;
  sandbox: boolean;
  apiBaseUrl: string;
}

export const mercadoPagoConfig = (): MercadoPagoConfig => ({
  accessToken: (process.env.MP_ACCESS_TOKEN || '').trim(),
  webhookSecret: (process.env.MP_WEBHOOK_SECRET || '').trim(),
  notificationUrl: (process.env.MP_NOTIFICATION_URL || '').trim(),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  ttlMinutes: Math.max(5, Number(process.env.MP_PREFERENCE_TTL_MINUTES || 30)),
  sandbox: (process.env.MP_SANDBOX ?? 'true').toLowerCase() === 'true',
  apiBaseUrl: (process.env.MP_API_BASE_URL || 'https://api.mercadopago.com').replace(/\/$/, ''),
});

export const isMercadoPagoEnabled = (c = mercadoPagoConfig()) => c.sandbox && !!c.accessToken;
