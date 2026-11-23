import { createHmac, timingSafeEqual } from 'crypto';

export interface SignatureInput {
  /** Header x-signature: "ts=1704908010,v1=618c8534..." */
  xSignature?: string | null;
  /** Header x-request-id */
  xRequestId?: string | null;
  /** Query param data.id de la notificación */
  dataId?: string | null;
  /** Clave secreta de Webhooks (Tus integraciones > Webhooks) */
  secret: string;
}

/**
 * Validación del origen de una notificación según la documentación oficial:
 * manifest "id:[data.id];request-id:[x-request-id];ts:[ts];" firmado con
 * HMAC-SHA256 y la clave secreta; se compara con v1. Si data.id es
 * alfanumérico se usa en minúsculas. Las partes ausentes se omiten.
 */
export function verifyMercadoPagoSignature(input: SignatureInput): boolean {
  if (!input.secret || !input.xSignature) return false;

  const parts = Object.fromEntries(
    input.xSignature.split(',').map((part) => {
      const [k, ...v] = part.split('=');
      return [k?.trim(), v.join('=').trim()];
    }),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1 || !/^[a-f0-9]+$/i.test(v1)) return false;

  const manifest = buildManifest(input.dataId, input.xRequestId, ts);
  const expected = createHmac('sha256', input.secret).update(manifest).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1.toLowerCase(), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildManifest(dataId: string | null | undefined, requestId: string | null | undefined, ts: string): string {
  let manifest = '';
  if (dataId) {
    const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
    manifest += `id:${id};`;
  }
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}
