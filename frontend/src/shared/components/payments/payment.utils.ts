import type { PaymentMethod, PaymentSummaryStatus } from '../../../types/payments.types';

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

/** Centavos enteros -> "$ 7.000" (sin aritmética de punto flotante para calcular) */
export const formatCents = (cents: number | null | undefined) => {
  if (cents == null) return '—';
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const value = Number(`${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`);
  return (negative ? '-' : '') + ars.format(value);
};

/** "7000,50" o "7000.50" -> 700050. Devuelve null si no es un importe válido */
export const parsePesosToCents = (text: string): number | null => {
  const clean = text.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [int, dec = ''] = clean.split('.');
  return Number(int) * 100 + Number((dec + '00').slice(0, 2));
};

/** Decimal de la API ("3000.00" o 3000) -> centavos, sin floats. Solo para mostrar */
export const apiDecimalToCents = (value: number | string | null | undefined): number | null => {
  if (value == null || value === '') return null;
  const text = typeof value === 'number' ? value.toFixed(2) : value.trim();
  const m = /^(\d+)(?:\.(\d{1,}))?$/.exec(text);
  if (!m) return null;
  return Number(m[1]) * 100 + Number(((m[2] ?? '') + '00').slice(0, 2));
};

export const methodLabel: Record<PaymentMethod, string> = {
  WALLET: 'Billetera EstacionApp',
  MERCADO_PAGO: 'Mercado Pago',
  PRESENTIAL: 'Pago presencial',
};

export const statusStyle: Record<PaymentSummaryStatus, { label: string; className: string }> = {
  APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-700' },
  PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  REJECTED: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelado', className: 'bg-slate-200 text-slate-600' },
  NONE: { label: 'Sin pago registrado', className: 'bg-slate-100 text-slate-500' },
  COVERED: { label: 'Cubierto por la reserva', className: 'bg-violet-100 text-violet-700' },
};

export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
