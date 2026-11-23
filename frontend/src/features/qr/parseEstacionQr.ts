/**
 * Interpreta el texto leído de un QR y decide si es un QR de EstacionApp.
 *
 * El backend (QRService.getQRUrl) genera: `${FRONTEND_URL}/scan/{check-in|check-out}?token=<64 hex>`.
 * Solo se acepta esa forma exacta. El host no se usa: la app nunca navega
 * fuera de sí misma, solo arma la ruta interna /scan/... con el token.
 * La validación definitiva del token la hace el backend.
 */
export type EstacionQrType = 'check-in' | 'check-out';

export type ParsedEstacionQr =
  | { ok: true; type: EstacionQrType; token: string; path: string }
  | { ok: false; reason: 'not-estacionapp' | 'bad-format' };

// QRService.generateToken: crypto.randomBytes(32).toString('hex') → 64 hex en minúscula
const TOKEN_RE = /^[a-f0-9]{64}$/;
const PATH_RE = /^\/scan\/(check-in|check-out)\/?$/;
const MAX_LENGTH = 2048;

export function parseEstacionQr(raw: string): ParsedEstacionQr {
  const text = (raw ?? '').trim();
  if (!text || text.length > MAX_LENGTH) return { ok: false, reason: 'not-estacionapp' };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: 'not-estacionapp' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'not-estacionapp' };
  if (url.username || url.password) return { ok: false, reason: 'not-estacionapp' };

  const match = PATH_RE.exec(url.pathname);
  if (!match) return { ok: false, reason: 'not-estacionapp' };

  const tokens = url.searchParams.getAll('token');
  if (tokens.length !== 1 || !TOKEN_RE.test(tokens[0])) return { ok: false, reason: 'bad-format' };

  const type = match[1] as EstacionQrType;
  const token = tokens[0];
  return { ok: true, type, token, path: `/scan/${type}?token=${token}` };
}
