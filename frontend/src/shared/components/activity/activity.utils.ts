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
  item.type === 'check_in' ? 'Ingreso' : item.type === 'check_out' ? 'Egreso' : 'Reserva';
