/**
 * Reservas programadas: cálculo de horarios habilitados (lógica pura, sin BD).
 *
 * Reglas (historia "Clientes: Sistema de Reservas"):
 *  - Solo horas en punto (sin minutos) para ingreso y egreso.
 *  - Mismo día: el ingreso debe ser al menos MIN_LEAD_MINUTES (1 h) después de ahora.
 *  - Otro día: cualquier hora dentro del horario de atención.
 *  - Ingreso y egreso siempre dentro del horario de apertura/cierre del estacionamiento.
 *  - Reserva hecha con >= SCHEDULED_THRESHOLD_HOURS (24 h) de anticipación => "programada",
 *    con tarifa diferencial (descuento configurable por estacionamiento).
 *  - Solo se ofrecen horarios en los que hay al menos un espacio compatible libre.
 */
import { zonedInstant } from '../occupancy-services/charge-calculator';

export const HOUR_MS = 60 * 60 * 1000;
export const MIN_LEAD_MINUTES = 60;
export const SCHEDULED_THRESHOLD_HOURS = 24;
export const DEFAULT_SCHEDULED_DISCOUNT_PERCENT = 10;
export const DEFAULT_MAX_ADVANCE_DAYS = 15;
export const DEFAULT_MAX_RESERVATION_HOURS = 24;

export interface ScheduleSettings {
  openTime: string; // 'HH:mm' o 'HH:mm:ss'
  closeTime: string;
  timeZone: string;
  maxAdvanceDays: number;
  maxReservationHours: number;
}

/** Espacio candidato con las reservas activas que ya lo ocupan */
export interface SpaceBusy {
  spaceId: string;
  spaceNumber: string;
  /** true si hoy está ocupado físicamente: no sirve para ingresos inminentes */
  currentlyOccupied: boolean;
  busy: Array<{ start: number; end: number }>;
}

export interface Window {
  start: number;
  end: number;
}

// ------------------------------------------------------------ helpers de zona horaria

function localParts(instant: number, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(instant))) p[part.type] = part.value;
  return {
    y: +p.year,
    m: +p.month,
    d: +p.day,
    hh: +p.hour,
    mm: +p.minute,
    ss: +p.second,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' en la zona del estacionamiento */
export function localDateKey(instant: number, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** 'HH:00' en la zona del estacionamiento */
export function localHourLabel(instant: number, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return `${pad(p.hh)}:${pad(p.mm)}`;
}

/** true si el instante cae exactamente en una hora en punto local */
export function isWholeLocalHour(instant: number, timeZone: string): boolean {
  const p = localParts(instant, timeZone);
  return p.mm === 0 && p.ss === 0 && instant % 1000 === 0;
}

/** Primera hora en punto local >= instant */
export function ceilToLocalHour(instant: number, timeZone: string): number {
  const p = localParts(instant, timeZone);
  if (p.mm === 0 && p.ss === 0 && instant % 1000 === 0) return instant;
  return zonedInstant(p.y, p.m, p.d, p.hh + 1, 0, timeZone);
}

const parseHHMM = (v: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(v ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * Tramos [apertura, cierre] del estacionamiento que tocan [from, to].
 * Cierre <= apertura => cruza medianoche. Apertura == cierre => 24 h.
 * Los tramos contiguos se fusionan.
 */
export function openWindows(
  from: number,
  to: number,
  openTime: string,
  closeTime: string,
  timeZone: string,
): Window[] {
  const open = parseHHMM(openTime);
  const close = parseHHMM(closeTime);
  if (open === null || close === null) return [];

  const first = localParts(from, timeZone);
  const raw: Window[] = [];
  // arrancamos un día antes para cubrir tramos que cruzan medianoche
  for (let add = -1; ; add++) {
    const start = zonedInstant(first.y, first.m, first.d + add, Math.floor(open / 60), open % 60, timeZone);
    if (start > to) break;
    const closeDayOffset = close <= open ? 1 : 0;
    const end = zonedInstant(
      first.y,
      first.m,
      first.d + add + closeDayOffset,
      Math.floor(close / 60),
      close % 60,
      timeZone,
    );
    if (end >= from) raw.push({ start, end });
    if (add > 400) break; // resguardo
  }

  const merged: Window[] = [];
  for (const w of raw) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
    else merged.push({ ...w });
  }
  return merged;
}

/** Ventana total en la que se pueden ofrecer ingresos */
export function bookingHorizon(now: number, s: ScheduleSettings): Window {
  const earliest = ceilToLocalHour(now + MIN_LEAD_MINUTES * 60 * 1000, s.timeZone);
  const latest = now + s.maxAdvanceDays * 24 * HOUR_MS;
  return { start: earliest, end: latest };
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/** Espacios libres en [start, end] (el ocupado ahora solo descarta ingresos inminentes) */
export function freeSpaces(
  spaces: SpaceBusy[],
  start: number,
  end: number,
  now: number,
  imminentMs: number,
): SpaceBusy[] {
  return spaces.filter(sp => {
    if (sp.currentlyOccupied && start < now + imminentMs) return false;
    return !sp.busy.some(b => overlaps(start, end, b.start, b.end));
  });
}

export function isScheduled(now: number, start: number): boolean {
  return start - now >= SCHEDULED_THRESHOLD_HOURS * HOUR_MS;
}

export interface EntrySlot {
  startTime: string; // ISO UTC
  label: string; // 'HH:00'
  scheduled: boolean;
  freeSpaces: number;
}

export interface DaySlots<T> {
  date: string; // 'YYYY-MM-DD' local
  slots: T[];
}

/** Horarios de ingreso habilitados, agrupados por día local */
export function entrySlots(
  now: number,
  s: ScheduleSettings,
  spaces: SpaceBusy[],
  imminentMs: number,
): DaySlots<EntrySlot>[] {
  const horizon = bookingHorizon(now, s);
  const windows = openWindows(horizon.start, horizon.end, s.openTime, s.closeTime, s.timeZone);
  const days = new Map<string, EntrySlot[]>();

  for (const w of windows) {
    // el ingreso necesita al menos 1 h antes del cierre
    let t = ceilToLocalHour(Math.max(w.start, horizon.start), s.timeZone);
    for (; t + HOUR_MS <= w.end && t <= horizon.end; t += HOUR_MS) {
      const free = freeSpaces(spaces, t, t + HOUR_MS, now, imminentMs);
      if (free.length === 0) continue;
      const key = localDateKey(t, s.timeZone);
      if (!days.has(key)) days.set(key, []);
      days.get(key)!.push({
        startTime: new Date(t).toISOString(),
        label: localHourLabel(t, s.timeZone),
        scheduled: isScheduled(now, t),
        freeSpaces: free.length,
      });
    }
  }
  return [...days.entries()].map(([date, slots]) => ({ date, slots }));
}

/** true si `start` es un ingreso válido según las reglas (sin mirar espacios) */
export function validateEntry(now: number, start: number, s: ScheduleSettings): string | null {
  if (!isWholeLocalHour(start, s.timeZone))
    return 'El horario de ingreso debe ser una hora en punto (sin minutos)';
  const horizon = bookingHorizon(now, s);
  if (start < horizon.start)
    return `El ingreso debe ser al menos ${MIN_LEAD_MINUTES / 60} h después de la hora actual`;
  if (start > horizon.end)
    return `No se puede reservar con más de ${s.maxAdvanceDays} días de anticipación`;
  const inside = openWindows(start - 1, start + HOUR_MS, s.openTime, s.closeTime, s.timeZone).some(
    w => start >= w.start && start + HOUR_MS <= w.end,
  );
  if (!inside) return 'El horario de ingreso está fuera del horario de atención del estacionamiento';
  return null;
}

/** true si `end` es un egreso válido para `start` (sin mirar espacios) */
export function validateExit(start: number, end: number, s: ScheduleSettings): string | null {
  if (!isWholeLocalHour(end, s.timeZone))
    return 'El horario de egreso debe ser una hora en punto (sin minutos)';
  if (end <= start) return 'El egreso debe ser posterior al ingreso';
  if (end - start > s.maxReservationHours * HOUR_MS)
    return `La reserva no puede exceder las ${s.maxReservationHours} horas`;
  const inside = openWindows(end - 1, end + 1, s.openTime, s.closeTime, s.timeZone).some(
    w => end >= w.start && end <= w.end,
  );
  if (!inside) return 'El horario de egreso está fuera del horario de atención del estacionamiento';
  return null;
}

export interface ExitSlot {
  endTime: string;
  label: string;
  hours: number;
}

/** Egresos posibles para un ingreso dado, agrupados por día local */
export function exitSlots(
  now: number,
  start: number,
  s: ScheduleSettings,
  spaces: SpaceBusy[],
  imminentMs: number,
): DaySlots<ExitSlot>[] {
  const maxEnd = start + s.maxReservationHours * HOUR_MS;
  const windows = openWindows(start, maxEnd, s.openTime, s.closeTime, s.timeZone);
  const days = new Map<string, ExitSlot[]>();

  for (const w of windows) {
    let t = ceilToLocalHour(Math.max(w.start, start + HOUR_MS), s.timeZone);
    for (; t <= w.end && t <= maxEnd; t += HOUR_MS) {
      if (freeSpaces(spaces, start, t, now, imminentMs).length === 0) break;
      const key = localDateKey(t, s.timeZone);
      if (!days.has(key)) days.set(key, []);
      days.get(key)!.push({
        endTime: new Date(t).toISOString(),
        label: localHourLabel(t, s.timeZone),
        hours: Math.round((t - start) / HOUR_MS),
      });
    }
  }
  return [...days.entries()].map(([date, slots]) => ({ date, slots }));
}

export interface PriceQuote {
  hours: number;
  baseAmount: number;
  discountPercent: number;
  totalAmount: number;
  scheduled: boolean;
}

export function quote(
  now: number,
  start: number,
  end: number,
  pricePerHour: number,
  discountPercent: number,
): PriceQuote {
  const hours = Math.max(1, Math.ceil((end - start) / HOUR_MS));
  const baseAmount = Math.round(hours * pricePerHour * 100) / 100;
  const scheduled = isScheduled(now, start);
  const pct = scheduled ? Math.min(100, Math.max(0, discountPercent)) : 0;
  const totalAmount = Math.round(baseAmount * (1 - pct / 100) * 100) / 100;
  return { hours, baseAmount, discountPercent: pct, totalAmount, scheduled };
}
