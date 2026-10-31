import { useState } from 'react';
import { Car, ChevronDown, Clock3, MapPin, Moon, Receipt, Wrench } from 'lucide-react';
import type { Tracking } from '../../../types/client-tracking.types';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const VEHICLE_LABEL: Record<string, string> = { car: 'Auto', motorcycle: 'Moto', truck: 'Camioneta', van: 'Utilitario' };
const STATUS_LABEL: Record<string, string> = { selected: 'Solicitado', performed: 'Realizado', not_performed: 'No realizado' };

const formatElapsed = (minutes: number) => {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return [d ? `${d} d` : '', h ? `${h} h` : '', `${m} min`].filter(Boolean).join(' ');
};

interface TrackingCardProps {
  tracking: Tracking;
  /** minutos transcurridos recalculados en el cliente para la vista (el importe viene del backend) */
  liveElapsedMinutes: number;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

/** Tarjeta desplegable de un ingreso. El estado abierto/cerrado no detiene el seguimiento. */
function TrackingCard({ tracking: t, liveElapsedMinutes, defaultOpen = false, onToggle }: TrackingCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const active = t.status === 'active';
  const panelId = `tracking-${t.linkId}`;
  const included = t.services.filter((s) => s.pricingType !== 'extra_cost');
  const extras = t.services.filter((s) => s.pricingType === 'extra_cost');
  const vehicleTitle = [t.vehicle.name, [t.vehicle.brand, t.vehicle.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

  const toggle = () => {
    setOpen((o) => {
      onToggle?.(!o);
      return !o;
    });
  };

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${active ? 'border-green-300' : 'border-gray-200 opacity-90'}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50"
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <Car size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="inline-block rounded border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-sm font-bold tracking-wider">
            {t.vehicle.plate}
          </span>
          <span className={`mt-1 flex items-center gap-1.5 text-sm ${active ? 'text-green-700' : 'text-gray-500'}`}>
            {active && <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" aria-hidden />}
            {active
              ? `Tu vehículo se encuentra en ${t.parkingLot.name}`
              : `Finalizado · egresó ${t.checkOutTime ? dateTime.format(new Date(t.checkOutTime)) : ''}`}
          </span>
        </span>
        <ChevronDown size={20} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="grid gap-4 border-t border-gray-100 p-4 text-sm md:grid-cols-2">
          <section>
            <h4 className="mb-1 font-semibold text-gray-700">Vehículo</h4>
            {vehicleTitle && <p className="text-gray-800">{vehicleTitle}</p>}
            <p className="text-gray-600">
              {t.vehicle.plate} · {VEHICLE_LABEL[t.vehicle.vehicleType] ?? t.vehicle.vehicleType}
            </p>
          </section>

          <section>
            <h4 className="mb-1 flex items-center gap-1 font-semibold text-gray-700">
              <MapPin size={14} /> Estacionamiento
            </h4>
            <p className="text-gray-800">{t.parkingLot.name}</p>
            <p className="text-gray-600">{t.parkingLot.address}</p>
          </section>

          <section>
            <h4 className="mb-1 flex items-center gap-1 font-semibold text-gray-700">
              <Clock3 size={14} /> Ingreso
            </h4>
            <p className="text-gray-800">{dateTime.format(new Date(t.checkInTime))}</p>
            <p className="text-gray-600">
              {active ? 'Tiempo transcurrido' : 'Permanencia'}: {formatElapsed(active ? liveElapsedMinutes : t.elapsedMinutes)}
            </p>
            <p className={active ? 'text-green-700' : 'text-gray-500'}>Estado: {active ? 'Ingreso activo (sin egreso)' : 'Egreso confirmado'}</p>
          </section>

          <section>
            <h4 className="mb-1 flex items-center gap-1 font-semibold text-gray-700">
              <Receipt size={14} /> {active ? 'Tarifa aproximada' : 'Importe'}
            </h4>
            {active && t.estimate && (
              <>
                <p className="text-lg font-bold text-gray-900">≈ {money.format(t.estimate.total)}</p>
                <p className="text-xs text-gray-600">
                  {t.estimate.hourlyHours} h × {money.format(t.estimate.pricePerHour)}
                  {t.estimate.nights > 0 && ` + ${t.estimate.nights} noche(s) × ${money.format(t.estimate.nightAmountPerNight ?? 0)}`}
                  {t.estimate.servicesAmount > 0 && ` + servicios ${money.format(t.estimate.servicesAmount)}`}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Estimado en ARS al {new Date(t.estimate.calculatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}. No es el cobro
                  definitivo: el importe final se calcula al registrar el egreso.
                </p>
              </>
            )}
            {active && !t.estimate && <p className="text-gray-500">No hay tarifa configurada para estimar el importe.</p>}
            {!active && (
              <p className="text-lg font-bold text-gray-900">{t.finalAmount != null ? money.format(t.finalAmount) : 'Sin importe registrado'}</p>
            )}
            {t.nightPolicy && (
              <p className="mt-1 flex items-start gap-1 text-xs text-indigo-700">
                <Moon size={12} className="mt-0.5 shrink-0" />
                {t.nightPolicy.mode === 'special' && t.nightPolicy.nightAmount
                  ? `Cierra a las ${t.nightPolicy.closeTime}. Si queda después del cierre (+${t.nightPolicy.toleranceMinutes} min) se cobra ${money.format(t.nightPolicy.nightAmount)} por noche.`
                  : `Cierra a las ${t.nightPolicy.closeTime}. Después del cierre se sigue cobrando por hora.`}
              </p>
            )}
          </section>

          <section className="md:col-span-2">
            <h4 className="mb-1 flex items-center gap-1 font-semibold text-gray-700">
              <Wrench size={14} /> Servicios
            </h4>
            {t.services.length === 0 ? (
              <p className="text-gray-500">No se solicitaron servicios para este ingreso.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Incluidos / gratuitos</p>
                  {included.length ? (
                    <ul className="text-gray-700">
                      {included.map((s) => (
                        <li key={s.key}>
                          {s.name} <span className="text-xs text-gray-500">· {STATUS_LABEL[s.status] ?? s.status}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Adicionales</p>
                  {extras.length ? (
                    <ul className="text-gray-700">
                      {extras.map((s) => (
                        <li key={s.key} className="flex justify-between gap-2">
                          <span>
                            {s.name} <span className="text-xs text-gray-500">· {STATUS_LABEL[s.status] ?? s.status}</span>
                          </span>
                          <span className="font-medium">{s.status === 'not_performed' ? 'Sin cargo' : money.format(s.estimatedSubtotal || (s.amount ?? 0))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">—</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  );
}

export default TrackingCard;
