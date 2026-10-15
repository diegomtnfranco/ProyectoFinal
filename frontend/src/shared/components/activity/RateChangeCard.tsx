// shared/components/activity/RateChangeCard.tsx
import { ArrowRight, BadgeDollarSign, Mail, UserRound } from 'lucide-react';
import type { ActivityItem } from '../../../types/activity.types';
import { formatActivityTime, formatMoney, formatRelative, vehicleTypeInfo } from './activity.utils';

const actionStyles = {
  created: { label: 'Nueva tarifa', badge: 'bg-emerald-100 text-emerald-700', accent: 'border-l-emerald-500' },
  updated: { label: 'Tarifa atualizada', badge: 'bg-amber-100 text-amber-700', accent: 'border-l-amber-500' },
  deleted: { label: 'Tarifa eliminada', badge: 'bg-red-100 text-red-700', accent: 'border-l-red-500' },
} as const;

interface RateChangeCardProps {
  item: ActivityItem;
}

/** Tarjeta de actividad para altas, ediciones y bajas de tarifas */
function RateChangeCard({ item }: RateChangeCardProps) {
  const change = item.rateChange;
  if (!change) return null;

  const style = actionStyles[change.action];
  const vehicle = vehicleTypeInfo[item.vehicleType] ?? { label: item.vehicleType, icon: vehicleTypeInfo.car.icon };
  const VehicleIcon = vehicle.icon;
  const perHour = (v: number | null) => (v == null ? 'Sin tarifa' : `${formatMoney(v)} / h`);

  return (
    <article className={`rounded-xl border border-slate-200 border-l-4 ${style.accent} bg-white p-3 shadow-sm`}>
      {/* Encabezado: tipo de cambio + hace cuánto */}
      <header className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>
          <BadgeDollarSign size={13} /> {style.label}
        </span>
        <time className="text-[11px] text-slate-400" dateTime={item.occurredAt}>
          {formatRelative(item.occurredAt)}
        </time>
      </header>

      {/* Tipo de vehículo de la tarifa */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <VehicleIcon size={22} className="text-blue-500" aria-label={vehicle.label} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{vehicle.label}</p>
          <p className="text-xs text-slate-500">Cambio a las {formatActivityTime(item.occurredAt) ?? '—'}</p>
        </div>
      </div>

      {/* Tarifa anterior → nueva */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <div className="rounded-md bg-slate-50 p-2">
          <p className="text-slate-500">Tarifa anterior</p>
          <p className={`font-semibold ${change.previousPricePerHour == null ? 'text-slate-400' : 'text-slate-500 line-through'}`}>
            {perHour(change.previousPricePerHour)}
          </p>
        </div>
        <ArrowRight size={14} className="text-slate-400" />
        <div className="rounded-md bg-slate-50 p-2">
          <p className="text-slate-500">Nueva tarifa</p>
          <p className={`font-semibold ${change.newPricePerHour == null ? 'text-red-600' : 'text-slate-900'}`}>
            {change.newPricePerHour == null ? 'Eliminada' : perHour(change.newPricePerHour)}
          </p>
        </div>
      </div>

      {/* Usuario que registró el cambio */}
      <footer className="mt-3 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-600">
        <p className="flex items-center gap-1.5">
          <UserRound size={12} className="text-slate-400" />
          <span className="font-medium">{change.changedByName ?? 'Usuario'}</span>
        </p>
        {change.changedByEmail && (
          <p className="flex items-center gap-1.5 truncate">
            <Mail size={12} className="text-slate-400" />
            <span className="truncate">{change.changedByEmail}</span>
          </p>
        )}
      </footer>
    </article>
  );
}

export default RateChangeCard;
