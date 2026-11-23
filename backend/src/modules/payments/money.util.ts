/**
 * Conversión de importes sin aritmética de punto flotante.
 * Toda la feature de pagos trabaja en centavos enteros (columnas bigint).
 */

const DECIMAL_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

/**
 * Convierte un decimal de PostgreSQL ("7000.50", "7000") o un number a centavos.
 * Redondea a 2 decimales con la regla "half up" sobre el texto, no sobre floats.
 */
export function decimalToCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const text = typeof value === 'number' ? numberToPlainString(value) : String(value).trim();
  const match = DECIMAL_RE.exec(text);
  if (!match) throw new Error(`Importe inválido: ${text}`);
  const [, sign, intPart, fracRaw = ''] = match;
  const frac = (fracRaw + '000').slice(0, 3);
  let cents = BigInt(intPart) * 100n + BigInt(frac.slice(0, 2));
  if (Number(frac[2]) >= 5) cents += 1n;
  if (sign) cents = -cents;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Importe fuera de rango');
  return Number(cents);
}

/** 700050 -> "7000.50" (para APIs externas y para mostrar) */
export function centsToDecimalString(cents: number): string {
  const negative = cents < 0;
  const abs = BigInt(Math.abs(Math.trunc(cents)));
  const text = `${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
  return negative ? `-${text}` : text;
}

/** Mercado Pago espera unit_price como número en pesos */
export function centsToPesosNumber(cents: number): number {
  return Number(centsToDecimalString(cents));
}

/** Formato para textos de notificaciones: $ 7.000,50 */
export function formatArs(cents: number): string {
  const [int, dec] = centsToDecimalString(cents).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec === '00' ? `$ ${grouped}` : `$ ${grouped},${dec}`;
}

function numberToPlainString(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Importe inválido');
  // toFixed(3) evita notación científica y conserva el tercer decimal para redondear
  return value.toFixed(3);
}

/** Transformer de TypeORM: bigint (string en pg) <-> number de centavos */
export const centsTransformer = {
  to: (value: number | null | undefined) => (value === null || value === undefined ? value : String(value)),
  from: (value: string | null) => (value === null || value === undefined ? value : Number(value)),
};
