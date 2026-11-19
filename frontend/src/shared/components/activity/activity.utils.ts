import { CarFront, Motorbike, Truck, Van } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ActivityItem } from '../../../types/activity.types';

export const vehicleTypeInfo: Record<string, { label: string; icon: LucideIcon }> = {
  car: { label: 'Auto', icon: CarFront },
  motorcycle: { label: 'Moto', icon: Motorbike },
  truck: { label: 'Camioneta', icon: Van },
  van: { label: 'Utilitario', icon: Truck },
};

export const reservationStatusLabel: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'Pago pendiente', className: 'bg-amber-100 text-amber-700' },
  pending_confirmation: { label: 'Por confirmar', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmada', className: 'bg-green-100 text-green-700' },
  cancelled_by_client: { label: 'Cancelada (cliente)', className: 'bg-red-100 text-red-700' },
  cancelled_by_parking: { label: 'Rechazada', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Vencida', className: 'bg-slate-100 text-slate-600' },
  completed: { label: 'Completada', className: 'bg-slate-100 text-slate-600' },
};

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number | null) => (value == null ? '—' : currency.format(value));

/** "14:05" si es de hoy, "14:05 · 11/10" si no */
export const formatActivityTime = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return isToday(d) ? format(d, 'HH:mm') : format(d, "HH:mm '·' dd/MM", { locale: es });
};

export const formatRelative = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
};

export const activityTitle = (item: ActivityItem) =>
  item.type === 'check_in'
    ? 'Ingreso'
    : item.type === 'check_out'
      ? 'Egreso'
      : item.type === 'rate_change'
        ? 'Tarifa'
        : 'Reserva';

/* ------------------------------------------------------------------
 * Tema visual de las tarjetas de actividad (diseño "Tarjeta de actividad").
 * Neutros cálidos (stone) + un color por tipo:
 *   Ingreso → verde · Reserva → morado · Egreso → rojo · Tarifa → naranja
 * Las clases van completas para que Tailwind las detecte.
 * ------------------------------------------------------------------ */
export interface ActivityTheme {
  /** barra de acento izquierda */
  accent: string;
  /** cuadrado del ícono de vehículo: fondo + color */
  tile: string;
  /** pastilla del tipo: fondo + texto */
  badge: string;
  /** color del ícono dentro de la pastilla */
  badgeIcon: string;
  /** borde y sombra en hover de la tarjeta */
  hover: string;
  /** anillo de foco */
  ring: string;
}

export const activityTheme: Record<ActivityItem['type'], ActivityTheme> = {
  check_in: {
    accent: 'bg-[#22A55A]',
    tile: 'bg-[#ECFBF1] text-[#15803D]',
    badge: 'bg-[#E3F8EA] text-[#166534]',
    badgeIcon: 'text-[#16A34A]',
    hover: 'hover:border-[#BFE9CF] hover:shadow-[0_6px_18px_rgba(34,165,90,0.12)]',
    ring: 'focus-visible:ring-[#22A55A]/40',
  },
  reservation: {
    accent: 'bg-[#8B5CF6]',
    tile: 'bg-[#F5F3FF] text-[#6D28D9]',
    badge: 'bg-[#EDE9FE] text-[#5B21B6]',
    badgeIcon: 'text-[#7C3AED]',
    hover: 'hover:border-[#DDD3FB] hover:shadow-[0_6px_18px_rgba(139,92,246,0.12)]',
    ring: 'focus-visible:ring-[#8B5CF6]/40',
  },
  check_out: {
    accent: 'bg-[#E5484D]',
    tile: 'bg-[#FFF0EE] text-[#B91C1C]',
    badge: 'bg-[#FEE4E2] text-[#9F1D1D]',
    badgeIcon: 'text-[#DC2626]',
    hover: 'hover:border-[#F6CCC8] hover:shadow-[0_6px_18px_rgba(229,72,77,0.12)]',
    ring: 'focus-visible:ring-[#E5484D]/40',
  },
  rate_change: {
    accent: 'bg-[#F97316]',
    tile: 'bg-[#FFF4E8] text-[#C2410C]',
    badge: 'bg-[#FFEDD5] text-[#9A3412]',
    badgeIcon: 'text-[#EA580C]',
    hover: 'hover:border-[#FAD7B5] hover:shadow-[0_6px_18px_rgba(249,115,22,0.12)]',
    ring: 'focus-visible:ring-[#F97316]/40',
  },
};

/** Etiqueta de la pastilla de una tarifa (todas en naranja) */
export const rateChangeLabel = {
  created: 'Nueva tarifa',
  updated: 'Tarifa actualizada',
  deleted: 'Tarifa eliminada',
} as const;

/** Ordena de la más reciente a la menos reciente (no muta el array) */
export const sortByRecent = <T extends { occurredAt: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

/** Versión corta de formatRelative para espacios angostos: "recién", "hace 5 min", "hace 3 h", "hace 2 d" */
export const formatRelativeShort = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return format(d, 'dd/MM', { locale: es });
};
