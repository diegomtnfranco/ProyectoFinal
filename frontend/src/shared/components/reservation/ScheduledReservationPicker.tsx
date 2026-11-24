import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CalendarClock, Clock3, Tag } from 'lucide-react';
import ReservationCalendar from './ReservationCalendar';
import { formatDayLabel, formatDuration, formatShortDate, todayKey } from './schedule.utils';
import { reservationsService } from '../../../services/reservations.service';
import type {
  EntrySlot,
  ExitSlot,
  ReservationAvailability,
  ReservationExitOptions,
} from '../../../types/parking.types';

export interface ScheduledSelection {
  startTime: string; // ISO
  endTime: string; // ISO
  startLabel: string; // 'mié 26/11 · 10:00'
  endLabel: string;
  exit: ExitSlot;
}

interface Props {
  parkingLotId: string;
  vehicleType: string;
  onChange: (selection: ScheduledSelection | null) => void;
}

type Step = 'entry' | 'exit';

const money = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function ScheduledReservationPicker({ parkingLotId, vehicleType, onChange }: Props) {
  const [availability, setAvailability] = useState<ReservationAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('entry');
  const [entryDay, setEntryDay] = useState('');
  const [entry, setEntry] = useState<EntrySlot | null>(null);

  const [exits, setExits] = useState<ReservationExitOptions | null>(null);
  const [exitsLoading, setExitsLoading] = useState(false);
  const [exitDay, setExitDay] = useState('');
  const [exit, setExit] = useState<ExitSlot | null>(null);

  const timeZone = availability?.timeZone ?? 'America/Argentina/Buenos_Aires';

  // 1) Al abrir se piden SOLO los horarios habilitados.
  //    El padre remonta el componente (key) cuando cambia el vehículo.
  useEffect(() => {
    let cancelled = false;
    reservationsService
      .getAvailability(parkingLotId, vehicleType)
      .then((data) => {
        if (cancelled) return;
        setAvailability(data);
        setEntryDay(data.days[0]?.date ?? '');
      })
      .catch((err) => !cancelled && setError(typeof err === 'string' ? err : 'No se pudieron cargar los horarios'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [parkingLotId, vehicleType]);

  // 2) Elegido el ingreso, se piden los egresos posibles y se pasa al paso "egreso"
  const exitsRequest = useRef(0);
  const chooseEntry = (slot: EntrySlot) => {
    const req = ++exitsRequest.current;
    setEntry(slot);
    setExit(null);
    setExits(null);
    setError(null);
    setExitsLoading(true);
    setStep('exit');
    onChange(null);
    reservationsService
      .getExitOptions(parkingLotId, vehicleType, slot.startTime)
      .then((data) => {
        if (req !== exitsRequest.current) return;
        setExits(data);
        setExitDay(data.days[0]?.date ?? '');
      })
      .catch((err) => req === exitsRequest.current && setError(typeof err === 'string' ? err : 'No se pudieron cargar los egresos'))
      .finally(() => req === exitsRequest.current && setExitsLoading(false));
  };

  const chooseEntryDay = (date: string) => {
    exitsRequest.current++;
    setEntryDay(date);
    setEntry(null);
    setExits(null);
    setExit(null);
    setExitsLoading(false);
    onChange(null);
  };

  const chooseExitDay = (date: string) => {
    setExitDay(date);
    setExit(null);
    onChange(null);
  };

  const chooseExit = (slot: ExitSlot) => {
    setExit(slot);
    if (!entry) return;
    onChange({
      startTime: entry.startTime,
      endTime: slot.endTime,
      startLabel: `${formatDayLabel(entryDay, timeZone)} · ${entry.label}`,
      endLabel: `${formatDayLabel(exitDay, timeZone)} · ${slot.label}`,
      exit: slot,
    });
  };

  const entrySlots = useMemo(
    () => availability?.days.find((d) => d.date === entryDay)?.slots ?? [],
    [availability, entryDay],
  );
  const exitSlots = useMemo(
    () => exits?.days.find((d) => d.date === exitDay)?.slots ?? [],
    [exits, exitDay],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 p-6 text-gray-600">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Buscando horarios disponibles...
      </div>
    );
  }

  if (error && !availability) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  if (!availability || availability.days.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <AlertCircle size={18} />
        No hay horarios disponibles para reservar en los próximos {availability?.maxAdvanceDays ?? 15} días.
      </div>
    );
  }

  const discount = availability.scheduledDiscountPercent;
  const onExitStep = step === 'exit' && !!entry;
  const calendarDays = onExitStep ? (exits?.days ?? []) : availability.days;

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Encabezado: ingreso → egreso (cada lado vuelve a su paso) */}
        <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-3">
          <button type="button" onClick={() => setStep('entry')} className="text-left">
            <span className={`block text-xs ${step === 'entry' ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
              Ingreso
            </span>
            <span className="block text-base font-bold text-gray-900">
              {entry ? `${formatShortDate(entryDay)} · ${entry.label}` : '—'}
            </span>
          </button>
          <span className="flex flex-col items-center px-2 text-xs font-semibold text-blue-700">
            {exit ? formatDuration(exit.hours) : ''}
            <span className="mt-1 flex w-16 items-center justify-between">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span className="h-px flex-1 bg-blue-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            </span>
          </span>
          <button
            type="button"
            disabled={!entry}
            onClick={() => setStep('exit')}
            className="text-right disabled:cursor-not-allowed"
          >
            <span className={`block text-xs ${step === 'exit' ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
              Egreso
            </span>
            <span className="block text-base font-bold text-gray-900">
              {exit ? `${formatShortDate(exitDay)} · ${exit.label}` : '—'}
            </span>
          </button>
        </div>

        <p className="mt-4 text-sm font-medium text-gray-700">
          {onExitStep ? '¿Cuándo salís? (aproximado)' : '¿Cuándo ingresás?'}
        </p>

        <div className="mt-2 border-t border-gray-100 pt-3">
          {onExitStep && exitsLoading ? (
            <p className="py-10 text-center text-sm text-gray-500">Calculando egresos posibles...</p>
          ) : onExitStep && calendarDays.length === 0 ? (
            <p className="py-10 text-center text-sm text-amber-700">
              No hay egresos disponibles para ese ingreso. Probá con otro horario.
            </p>
          ) : (
            <ReservationCalendar
              key={step}
              enabledDates={calendarDays.map((d) => d.date)}
              today={todayKey(timeZone)}
              selected={onExitStep ? exitDay : entryDay}
              rangeStart={entry ? entryDay : undefined}
              rangeEnd={exit ? exitDay : undefined}
              onSelect={onExitStep ? chooseExitDay : chooseEntryDay}
            />
          )}
        </div>

        {/* Horas del día elegido */}
        {(!onExitStep || (!exitsLoading && calendarDays.length > 0)) && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {formatShortDate(onExitStep ? exitDay : entryDay)}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {onExitStep
                ? exitSlots.map((slot) => (
                    <button
                      key={slot.endTime}
                      type="button"
                      onClick={() => chooseExit(slot)}
                      className={`rounded-xl border px-1 py-2 text-sm transition ${
                        exit?.endTime === slot.endTime
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <span className="block font-semibold">{slot.label}</span>
                      <span className={`block text-[11px] ${exit?.endTime === slot.endTime ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatDuration(slot.hours)}
                      </span>
                    </button>
                  ))
                : entrySlots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => chooseEntry(slot)}
                      className={`relative rounded-xl border px-1 py-2.5 text-sm font-semibold transition ${
                        entry?.startTime === slot.startTime
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {slot.label}
                      {slot.scheduled && discount > 0 && (
                        <span className="absolute -right-1 -top-2 rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white">
                          -{discount}%
                        </span>
                      )}
                    </button>
                  ))}
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
          <CalendarClock size={14} className="mt-0.5 shrink-0" />
          Atención de {availability.openTime} a {availability.closeTime}. Para hoy, desde{' '}
          {availability.minLeadMinutes / 60} h en adelante. Con {availability.scheduledThresholdHours} h o más de
          anticipación: {discount}% off.
        </p>
      </div>

      {/* RESUMEN */}
      {entry && exit && (
        <div className="mx-auto max-w-md rounded-2xl border border-green-200 bg-green-50 p-4">
          <h3 className="flex items-center gap-2 font-bold text-gray-800">
            <Clock3 size={18} className="text-green-600" /> Resumen
          </h3>
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            <p>
              Tu tarifa empieza a contar: <strong>{formatShortDate(entryDay)} · {entry.label}</strong>
            </p>
            <p>
              Termina aprox.: <strong>{formatShortDate(exitDay)} · {exit.label}</strong>
            </p>
            <p>Duración: <strong>{formatDuration(exit.hours)}</strong></p>
            {exit.scheduled && exit.discountPercent > 0 && (
              <>
                <p className="flex items-center gap-1 text-green-700">
                  <Tag size={14} /> Reserva programada: {exit.discountPercent}% de descuento
                </p>
                <p className="text-gray-500 line-through">${money(exit.baseAmount)}</p>
              </>
            )}
            <p className="text-lg font-semibold text-green-700">Total estimado: ${money(exit.totalAmount)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduledReservationPicker;
