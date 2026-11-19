import { useId, useState, type ReactNode } from 'react';
import {
  BadgeDollarSign,
  CalendarCheck,
  ChevronDown,
  LogIn,
  LogOut,
  Mail,
  PenLine,
  QrCode,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityItem } from '../../../types/activity.types';
import {
  activityTheme,
  activityTitle,
  formatActivityTime,
  formatMoney,
  formatRelative,
  formatRelativeShort,
  rateChangeLabel,
  reservationStatusLabel,
  vehicleTypeInfo,
} from './activity.utils';
import ActivityPaymentInfo from '../payments/ActivityPaymentInfo';

/* ==================================================================
 * Tarjeta de actividad
 * - Colapsada: tipo, vehículo, patente, espacio y tiempo transcurrido.
 * - Expandida: la misma fila arriba + un detalle con estructura fija
 *   (3 datos · etiquetas · recuadro inferior), igual para los 4 tipos,
 *   así todas las tarjetas expandidas miden lo mismo.
 * ================================================================== */

const typeIcon: Record<ActivityItem['type'], LucideIcon> = {
  check_in: LogIn,
  check_out: LogOut,
  reservation: CalendarCheck,
  rate_change: BadgeDollarSign,
};

const FONT = "font-['Inter',ui-sans-serif,system-ui,sans-serif]";
const MONO = "font-['JetBrains_Mono',ui-monospace,SFMono-Regular,monospace]";

/* ---------- piezas chicas ---------- */

function Chip({ icon: Icon, children, className = 'bg-[#F5F5F4] text-[#57534E]' }: { icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {Icon && <Icon size={13} strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  );
}

function methodChip(method: 'manual' | 'qr' | 'reservation', prefix?: string) {
  const Icon = method === 'qr' ? QrCode : method === 'reservation' ? CalendarCheck : PenLine;
  const text = method === 'qr' ? 'QR' : method === 'reservation' ? 'Reserva' : 'Manual';
  return (
    <Chip key={`${prefix ?? ''}${method}`} icon={Icon}>
      {prefix ? `${prefix}: ${text}` : text}
    </Chip>
  );
}

/** Recuadro de dato (horario / tarifa / total). Alto fijo para que todas las tarjetas coincidan */
function DataTile({ label, children, tone = 'bg-[#FAFAF9]', align = 'left', className = '' }: {
  label: string;
  children: ReactNode;
  tone?: string;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <div
      className={`flex h-[84px] flex-col justify-center gap-1 rounded-xl px-3.5 ${tone} ${
        align === 'right' ? 'items-end text-right' : ''
      } ${className}`}
    >
      <span className="text-xs font-medium text-[#6B6560]">{label}</span>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
}

/** "16:12 · 11/11" con la hora destacada */
function TimeValue({ iso }: { iso: string | null }) {
  const text = formatActivityTime(iso);
  if (!text) return <span className="text-xl font-bold text-[#A8A29E]">—</span>;
  const [hour, date] = text.split(' · ');
  return (
    <span className="whitespace-nowrap text-sm text-[#57534E]">
      <strong className="text-xl font-bold tabular-nums text-[#1C1917]">{hour}</strong>
      {date && <> · {date}</>}
    </span>
  );
}

const perHour = (v: number | null) => (v == null ? '—' : `${formatMoney(v)} / h`);

/* ---------- tarjeta ---------- */

interface ActivityCardProps {
  item: ActivityItem;
  /** Permite desplegar el detalle (página de Actividad). En el dashboard va en false. */
  expandable?: boolean;
  /** Fila colapsada con columnas extra de resumen en pantallas anchas (página de Actividad) */
  wide?: boolean;
}

function ActivityCard({ item, expandable = false, wide = false }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();

  const theme = activityTheme[item.type];
  const TypeIcon = typeIcon[item.type];
  const vehicle = vehicleTypeInfo[item.vehicleType] ?? { label: item.vehicleType, icon: vehicleTypeInfo.car.icon };
  const VehicleIcon = vehicle.icon;

  const isRate = item.type === 'rate_change';
  const isReservation = item.type === 'reservation';
  const rate = item.rateChange;
  const typeLabel = isRate && rate ? rateChangeLabel[rate.action] : activityTitle(item);
  const status = item.reservationStatus ? reservationStatusLabel[item.reservationStatus] : undefined;

  /* ----- textos de la fila colapsada ----- */
  const mainLine = isRate ? (
    <span className={`text-[17px] font-bold leading-7 tabular-nums text-[#1C1917] ${rate?.action === 'deleted' ? 'text-[#B42318]' : ''}`}>
      {rate?.action === 'deleted' ? 'Tarifa eliminada' : perHour(rate?.newPricePerHour ?? null)}
    </span>
  ) : (
    <span
      className={`self-start truncate rounded-[7px] border-[1.5px] border-[#D6D3D1] bg-white px-2 py-0.5 text-[17px] font-bold uppercase leading-6 tracking-[0.08em] text-[#1C1917] ${MONO}`}
    >
      {item.vehiclePlate}
    </span>
  );

  const subLine = isRate ? (
    <>
      {vehicle.label} · <span className="text-[#6B6560]">antes</span>{' '}
      <strong className="font-bold text-[#1C1917]">{perHour(rate?.previousPricePerHour ?? null)}</strong>
    </>
  ) : (
    <>
      {vehicle.label}
      {item.spaceNumber && (
        <>
          {' '}· <strong className="font-bold text-[#1C1917]">Espacio {item.spaceNumber}</strong>
        </>
      )}
    </>
  );

  /* ----- resumen de pantallas anchas ----- */
  const wideRange = isRate
    ? `${perHour(rate?.previousPricePerHour ?? null)} → ${rate?.newPricePerHour == null ? 'Eliminada' : perHour(rate.newPricePerHour)}`
    : `${formatActivityTime(item.checkInTime) ?? '—'} → ${formatActivityTime(item.checkOutTime) ?? (isReservation ? '—' : 'En el lugar')}`;
  const wideTotal = isRate ? (rate?.changedByName ?? 'Usuario') : formatMoney(item.totalAmount);

  const collapsedRow = (
    <>
      <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${theme.tile}`}>
        <VehicleIcon size={22} strokeWidth={1.8} aria-label={vehicle.label} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {mainLine}
        <span className="truncate text-[13px] text-[#6B6560]">{subLine}</span>
      </span>

      {wide && (
        <span className="hidden min-w-0 flex-col gap-1 lg:flex lg:w-56 xl:w-64">
          <span className="text-xs font-medium text-[#6B6560]">{isRate ? 'Tarifa' : isReservation ? 'Horario previsto' : 'Horario'}</span>
          <span className="truncate text-sm font-semibold tabular-nums text-[#1C1917]">{wideRange}</span>
        </span>
      )}
      {wide && (
        <span className="hidden min-w-0 flex-col items-end gap-1 lg:flex lg:w-36">
          <span className="text-xs font-medium text-[#6B6560]">{isRate ? 'Registrado por' : item.isEstimated ? 'Total estimado' : 'Total'}</span>
          <span className={`max-w-full truncate font-bold tabular-nums text-[#1C1917] ${isRate ? 'text-sm' : 'text-base'}`}>
            {!isRate && item.isEstimated && item.totalAmount != null && <span className="font-medium text-[#6B6560]">≈ </span>}
            {wideTotal}
          </span>
        </span>
      )}

      <span className="flex flex-none flex-col items-end gap-1.5">
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-bold ${theme.badge}`}>
          <TypeIcon size={13} strokeWidth={2} className={theme.badgeIcon} aria-hidden="true" />
          {typeLabel}
        </span>
        <time className="whitespace-nowrap text-xs text-[#6B6560]" dateTime={item.occurredAt} title={formatRelative(item.occurredAt)}>
          {wide ? formatRelative(item.occurredAt) : formatRelativeShort(item.occurredAt)}
        </time>
      </span>

      {expandable && (
        <span
          className={`flex h-11 w-8 flex-none items-center justify-center rounded-lg text-[#6B6560] transition-[transform,background-color,color] duration-300 ease-out
            group-hover/row:bg-[#F5F5F4] group-hover/row:text-[#1C1917] motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      )}
    </>
  );

  const rowClass = `group/row relative flex w-full items-center gap-3.5 py-3.5 pl-[18px] pr-2.5 text-left sm:gap-4`;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_1px_3px_rgba(28,25,23,0.06)] ${FONT}
        transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${theme.hover}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${theme.accent}`} aria-hidden="true" />

      {expandable ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={detailId}
          aria-label={`${typeLabel}${isRate ? ` ${vehicle.label}` : ` ${item.vehiclePlate}`}. ${expanded ? 'Colapsar' : 'Expandir'} detalle`}
          className={`${rowClass} rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-inset ${theme.ring}`}
        >
          {collapsedRow}
        </button>
      ) : (
        <div className={rowClass}>{collapsedRow}</div>
      )}

      {/* ---------- Detalle (solo expandible) ---------- */}
      {expandable && (
        <div
          id={detailId}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
          inert={!expanded}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-3 border-t border-[#F0EEEC] px-4 pb-4 pt-4 sm:pl-6 sm:pr-5">
              {/* 1 · Tres datos: mismo alto y misma grilla para todos los tipos */}
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                {isRate ? (
                  <>
                    <DataTile label="Tarifa anterior">
                      <span className={`whitespace-nowrap text-xl font-bold tabular-nums ${rate?.previousPricePerHour == null ? 'text-[#A8A29E]' : 'text-[#78716C] line-through decoration-[#A8A29E]'}`}>
                        {perHour(rate?.previousPricePerHour ?? null)}
                      </span>
                    </DataTile>
                    <DataTile label="Nueva tarifa" tone="bg-[#FFF7ED]">
                      <span className={`whitespace-nowrap text-xl font-bold tabular-nums ${rate?.newPricePerHour == null ? 'text-[#B42318]' : 'text-[#1C1917]'}`}>
                        {rate?.newPricePerHour == null ? 'Eliminada' : perHour(rate.newPricePerHour)}
                      </span>
                    </DataTile>
                    <DataTile label="Variación" align="right" className="col-span-2 md:col-span-1">
                      <RateDelta prev={rate?.previousPricePerHour ?? null} next={rate?.newPricePerHour ?? null} />
                    </DataTile>
                  </>
                ) : (
                  <>
                    <DataTile label={isReservation ? 'Ingreso previsto' : 'Ingreso'}>
                      <TimeValue iso={item.checkInTime} />
                    </DataTile>
                    {item.checkOutTime || isReservation ? (
                      <DataTile label={isReservation ? 'Egreso previsto' : 'Egreso'}>
                        <TimeValue iso={item.checkOutTime} />
                      </DataTile>
                    ) : (
                      <DataTile label="Egreso" tone="bg-[#F0FBF4]">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-[17px] font-bold leading-7 text-[#15803D]">
                          <span className="h-2 w-2 rounded-full bg-[#22C55E] shadow-[0_0_0_4px_rgba(34,197,94,0.18)] motion-safe:animate-pulse" />
                          En el lugar
                        </span>
                      </DataTile>
                    )}
                    <DataTile
                      label={item.isEstimated ? 'Total estimado' : 'Total'}
                      align="right"
                      className="col-span-2 md:col-span-1"
                    >
                      <span className="whitespace-nowrap text-[26px] font-bold leading-8 tracking-[-0.01em] tabular-nums text-[#1C1917]">
                        {item.isEstimated && item.totalAmount != null && <span className="font-medium text-[#6B6560]">≈ </span>}
                        {formatMoney(item.totalAmount)}
                      </span>
                    </DataTile>
                  </>
                )}
              </div>

              {/* 2 · Etiquetas: una sola fila de alto fijo */}
              <div className="flex min-h-[28px] flex-wrap items-center gap-1.5">
                {isRate ? (
                  <>
                    <Chip icon={vehicle.icon}>{vehicle.label}</Chip>
                    <Chip>Precio por hora</Chip>
                  </>
                ) : (
                  <>
                    {methodChip(item.entryMethod, item.exitMethod && item.exitMethod !== item.entryMethod ? 'Ingreso' : undefined)}
                    {item.exitMethod && item.exitMethod !== item.entryMethod && methodChip(item.exitMethod, 'Egreso')}
                    {!isReservation && item.hasReservation && item.entryMethod !== 'reservation' && (
                      <Chip icon={CalendarCheck} className="bg-[#F5F3FF] text-[#6D28D9]">Con reserva</Chip>
                    )}
                    {status && <Chip className={status.className}>{status.label}</Chip>}
                  </>
                )}
              </div>

              {/* 3 · Recuadro inferior: pago / cobro / autor del cambio. Alto mínimo común */}
              {isRate ? (
                <InfoBox
                  label="Registrado por"
                  value={
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[#1C1917]">
                      <UserRound size={15} className="flex-none text-[#A8A29E]" aria-hidden="true" />
                      <span className="truncate">{rate?.changedByName ?? 'Usuario'}</span>
                    </span>
                    {rate?.changedByEmail && (
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-[#57534E]">
                        <Mail size={15} className="flex-none text-[#A8A29E]" aria-hidden="true" />
                        <span className="truncate">{rate.changedByEmail}</span>
                      </span>
                    )}
                  </div>
                  }
                  aside={<Chip className="bg-[#FFEDD5] text-[#9A3412]">a las {formatActivityTime(item.occurredAt) ?? '—'}</Chip>}
                />
              ) : item.payment && (item.type === 'check_out' || isReservation) ? (
                <ActivityPaymentInfo
                  key={`${item.id}:${item.payment.status}:${item.payment.paymentId ?? ''}`}
                  payment={item.payment}
                  obligationType={isReservation ? 'RESERVATION' : 'OCCUPANCY'}
                  obligationId={item.sourceId}
                  vehiclePlate={item.vehiclePlate}
                />
              ) : (
                <InfoBox
                  label="Pago"
                  value={
                    <span className="text-sm font-semibold text-[#1C1917]">
                      {item.type === 'check_in' ? 'Se cobra al registrar el egreso' : 'Sin información de pago'}
                    </span>
                  }
                  aside={<Chip className="bg-[#F5F5F4] text-[#57534E]">{item.type === 'check_in' ? 'Estadía en curso' : 'Sin datos'}</Chip>}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/** Recuadro inferior neutro (mismo alto mínimo que el bloque de pago) */
function InfoBox({ label, value, aside }: { label: string; value: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex min-h-[88px] flex-col justify-center gap-2 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-[#6B6560]">{label}</span>
        {value}
      </div>
      {aside}
    </div>
  );
}

/** Diferencia entre tarifas: "+ $ 300 / h" y porcentaje */
function RateDelta({ prev, next }: { prev: number | null; next: number | null }) {
  if (prev == null || next == null) {
    return <span className="text-xl font-bold text-[#1C1917]">{next == null ? 'Sin tarifa' : 'Nueva'}</span>;
  }
  const diff = next - prev;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const up = diff > 0;
  const color = diff === 0 ? 'text-[#57534E]' : up ? 'text-[#C2410C]' : 'text-[#15803D]';
  return (
    <span className={`whitespace-nowrap text-sm ${color}`}>
      <strong className="text-[26px] font-bold leading-8 tracking-[-0.01em] tabular-nums">
        {diff === 0 ? '=' : `${up ? '+' : '−'} ${formatMoney(Math.abs(diff))}`}
      </strong>
      {pct != null && diff !== 0 && <> · {up ? '+' : '−'}{Math.abs(pct)} %</>}
    </span>
  );
}

export default ActivityCard;
