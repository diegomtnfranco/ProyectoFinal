import { CalendarCheck, LogIn, LogOut, PenLine, QrCode } from 'lucide-react';
import type { ActivityItem } from '../../../types/activity.types';
import {
  activityTitle,
  formatActivityTime,
  formatMoney,
  formatRelative,
  reservationStatusLabel,
  vehicleTypeInfo,
} from './activity.utils';

const typeStyles = {
  check_in: { icon: LogIn, badge: 'bg-green-100 text-green-700', accent: 'border-l-green-500' },
  check_out: { icon: LogOut, badge: 'bg-slate-200 text-slate-700', accent: 'border-l-slate-400' },
  reservation: { icon: CalendarCheck, badge: 'bg-violet-100 text-violet-700', accent: 'border-l-violet-500' },
} as const;

function MethodBadge({ method, label }: { method: 'manual' | 'qr' | 'reservation'; label: string }) {
  const Icon = method === 'qr' ? QrCode : method === 'reservation' ? CalendarCheck : PenLine;
  const text = method === 'qr' ? 'QR' : method === 'reservation' ? 'Reserva' : 'Manual';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
      title={`${label}: ${text}`}
    >
      <Icon size={11} /> {text}
    </span>
  );
}

interface ActivityCardProps {
  item: ActivityItem;
}

function ActivityCard({ item }: ActivityCardProps) {
  const style = typeStyles[item.type];
  const TypeIcon = style.icon;
  const vehicle = vehicleTypeInfo[item.vehicleType] ?? { label: item.vehicleType, icon: vehicleTypeInfo.car.icon };
  const VehicleIcon = vehicle.icon;
  const isReservation = item.type === 'reservation';
  const status = item.reservationStatus ? reservationStatusLabel[item.reservationStatus] : undefined;

  return (
    <article className={`rounded-xl border border-slate-200 border-l-4 ${style.accent} bg-white p-3 shadow-sm`}>
      {/* Encabezado: tipo de actividad + hace cuánto */}
      <header className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>
          <TypeIcon size={13} /> {activityTitle(item)}
        </span>
        <time className="text-[11px] text-slate-400" dateTime={item.occurredAt}>
          {formatRelative(item.occurredAt)}
        </time>
      </header>

      {/* Vehículo */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <VehicleIcon size={22} className="text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-sm font-semibold tracking-wider text-slate-800 inline-block">
            {item.vehiclePlate}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {vehicle.label}
            {item.spaceNumber && <> · Espacio {item.spaceNumber}</>}
          </p>
        </div>
      </div>

      {/* Horarios */}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-slate-50 p-2">
          <dt className="text-slate-500">{isReservation ? 'Ingreso previsto' : 'Ingreso'}</dt>
          <dd className="font-semibold text-slate-800">{formatActivityTime(item.checkInTime) ?? '—'}</dd>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <dt className="text-slate-500">{isReservation ? 'Egreso previsto' : 'Egreso'}</dt>
          <dd className="font-semibold text-slate-800">
            {formatActivityTime(item.checkOutTime) ?? <span className="font-normal text-green-600">En el lugar</span>}
          </dd>
        </div>
      </dl>

      {/* Método + total */}
      <footer className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <MethodBadge method={item.entryMethod} label="Ingreso" />
          {item.exitMethod && item.exitMethod !== item.entryMethod && (
            <MethodBadge method={item.exitMethod} label="Egreso" />
          )}
          {!isReservation && item.hasReservation && item.entryMethod !== 'reservation' && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-600">Con reserva</span>
          )}
          {status && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}>{status.label}</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">{item.isEstimated ? 'Total estimado' : 'Total'}</p>
          <p className="text-base font-bold text-slate-900">
            {item.isEstimated && item.totalAmount != null && <span className="font-normal text-slate-400">≈ </span>}
            {formatMoney(item.totalAmount)}
          </p>
        </div>
      </footer>
    </article>
  );
}

export default ActivityCard;
