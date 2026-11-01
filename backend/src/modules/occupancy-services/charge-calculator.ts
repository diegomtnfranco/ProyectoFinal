/**
 * Cálculo puro (sin base de datos) del importe de una estadía.
 *
 * Reglas confirmadas por el negocio:
 * - Modo HOURLY (o sin política): precio por hora × horas (redondeo hacia
 *   arriba, mínimo 1). Es exactamente el cálculo histórico del checkout.
 * - Modo SPECIAL: cada noche = tramo [cierre, reapertura). Una noche se cobra
 *   si el vehículo estuvo adentro después de cierre + 15 min de tolerancia.
 *   Cada noche cobrada vale el importe nocturno completo (aunque egrese antes
 *   de la reapertura) y reemplaza las horas de ese tramo. Las horas fuera de
 *   las noches cobradas se cobran por hora. Varias noches = varios importes.
 * - Servicios: solo los `extra_cost` generan cargo y nunca los marcados
 *   `not_performed` (se cobra lo seleccionado salvo que no se haya realizado). `per_hour` = precio ×
 *   horas totales de estadía (redondeo hacia arriba, mínimo 1); el resto se
 *   cobra una vez. `included` y `free` se listan con subtotal 0.
 */
import {
  NightRateMode,
  PriceUnit,
  PricingType,
} from '../parking-profiles/parking-profiles.constants';

const HOUR_MS = 3_600_000;

export interface NightPolicyInput {
  mode: NightRateMode;
  nightAmount: number | null;
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
  toleranceMinutes: number;
}

export interface ServiceChargeInput {
  key: string;
  name: string;
  pricing: {
    type: PricingType | null;
    amount: number | null;
    unit: PriceUnit | null;
  };
  /** selected | performed | not_performed */
  status?: string;
}

export interface ServiceChargeLine {
  key: string;
  name: string;
  pricingType: PricingType | null;
  unit: PriceUnit | null;
  unitPrice: number | null;
  quantity: number;
  subtotal: number;
  status: string;
}

export interface ParkingChargeResult {
  mode: NightRateMode;
  totalMinutes: number;
  hourlyHours: number;
  pricePerHour: number;
  hourlyAmount: number;
  nights: number;
  nightAmountPerNight: number | null;
  nightAmount: number;
  parkingAmount: number;
}

export interface ChargeBreakdown extends ParkingChargeResult {
  services: ServiceChargeLine[];
  servicesAmount: number;
  total: number;
  /** 'reservation' cuando el componente de estacionamiento lo fija una reserva (regla existente del egreso QR) */
  parkingSource: 'calculated' | 'reservation';
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

// ------------------------------------------------------------ zona horaria

function tzOffsetMs(instant: number, timeZone: string): number {
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
  for (const part of dtf.formatToParts(new Date(instant)))
    p[part.type] = part.value;
  const asUtc = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

function localDate(
  instant: number,
  timeZone: string,
): { y: number; m: number; d: number } {
  const local = new Date(instant + tzOffsetMs(instant, timeZone));
  return {
    y: local.getUTCFullYear(),
    m: local.getUTCMonth() + 1,
    d: local.getUTCDate(),
  };
}

/** Instante UTC de una fecha/hora de pared en la zona indicada (Date.UTC normaliza desbordes de día) */
export function zonedInstant(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string,
): number {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMs(guess, timeZone);
  let t = guess - offset;
  const offset2 = tzOffsetMs(t, timeZone);
  if (offset2 !== offset) t = guess - offset2;
  return t;
}

const parseHHMM = (value: string): [number, number] => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!match) throw new Error(`Horario inválido: ${value}`);
  return [Number(match[1]), Number(match[2])];
};

const overlap = (a0: number, a1: number, b0: number, b1: number) =>
  Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/** Tramos [cierre, reapertura) que tocan la estadía. Apertura = cierre => 24 h, sin noches. */
export function nightWindows(
  checkIn: number,
  checkOut: number,
  openTime: string,
  closeTime: string,
  timeZone: string,
): { start: number; end: number }[] {
  const [oh, om] = parseHHMM(openTime);
  const [ch, cm] = parseHHMM(closeTime);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  if (openMin === closeMin) return [];

  const first = localDate(checkIn, timeZone);
  const last = localDate(checkOut, timeZone);
  const lastKey = Date.UTC(last.y, last.m - 1, last.d);
  const windows: { start: number; end: number }[] = [];

  // Desde el día anterior al ingreso (cubre noches que empezaron antes)
  for (
    let day = Date.UTC(first.y, first.m - 1, first.d - 1);
    day <= lastKey;
    day += 86_400_000
  ) {
    const dt = new Date(day);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const start = zonedInstant(y, m, d, ch, cm, timeZone);
    // Cierre después de la apertura (ej. 08–20): reabre al día siguiente.
    // Cierre antes de la apertura (ej. 08–02): el cierre ya es de madrugada y reabre ese mismo día.
    const end =
      closeMin > openMin
        ? zonedInstant(y, m, d + 1, oh, om, timeZone)
        : zonedInstant(y, m, d, oh, om, timeZone);
    if (overlap(checkIn, checkOut, start, end) > 0)
      windows.push({ start, end });
  }
  return windows;
}

// ------------------------------------------------------------ cálculo

export function computeParkingCharge(input: {
  checkIn: Date;
  checkOut: Date;
  pricePerHour: number;
  policy: NightPolicyInput | null;
  timeZone: string;
}): ParkingChargeResult {
  const checkIn = input.checkIn.getTime();
  const checkOut = input.checkOut.getTime();
  const totalMs = Math.max(0, checkOut - checkIn);
  const pricePerHour = Number(input.pricePerHour);
  const totalMinutes = Math.ceil(totalMs / 60_000);

  const hourly = (mode: NightRateMode): ParkingChargeResult => {
    const hours = Math.max(1, Math.ceil(totalMs / HOUR_MS));
    const amount = round2(pricePerHour * hours);
    return {
      mode,
      totalMinutes,
      hourlyHours: hours,
      pricePerHour,
      hourlyAmount: amount,
      nights: 0,
      nightAmountPerNight:
        mode === NightRateMode.SPECIAL
          ? Number(input.policy?.nightAmount ?? 0) || null
          : null,
      nightAmount: 0,
      parkingAmount: amount,
    };
  };

  const policy = input.policy;
  const nightPrice = Number(policy?.nightAmount ?? 0);
  if (!policy || policy.mode !== NightRateMode.SPECIAL || !(nightPrice > 0)) {
    return hourly(NightRateMode.HOURLY);
  }

  const toleranceMs = Math.max(0, policy.toleranceMinutes) * 60_000;
  const charged = nightWindows(
    checkIn,
    checkOut,
    policy.openTime,
    policy.closeTime,
    input.timeZone,
  ).filter((w) => overlap(checkIn, checkOut, w.start + toleranceMs, w.end) > 0);
  if (charged.length === 0) return hourly(NightRateMode.SPECIAL);

  const nightMs = charged.reduce(
    (acc, w) => acc + overlap(checkIn, checkOut, w.start, w.end),
    0,
  );
  const dayMs = Math.max(0, totalMs - nightMs);
  const dayHours = Math.ceil(dayMs / HOUR_MS);
  const hourlyAmount = round2(pricePerHour * dayHours);
  const nightAmount = round2(nightPrice * charged.length);

  return {
    mode: NightRateMode.SPECIAL,
    totalMinutes,
    hourlyHours: dayHours,
    pricePerHour,
    hourlyAmount,
    nights: charged.length,
    nightAmountPerNight: nightPrice,
    nightAmount,
    parkingAmount: round2(hourlyAmount + nightAmount),
  };
}

export function computeServicesCharge(
  services: ServiceChargeInput[],
  totalMs: number,
): { lines: ServiceChargeLine[]; total: number } {
  const stayHours = Math.max(1, Math.ceil(Math.max(0, totalMs) / HOUR_MS));
  const lines = services.map((s): ServiceChargeLine => {
    const isExtra =
      s.pricing.type === PricingType.EXTRA_COST &&
      s.pricing.amount != null &&
      Number(s.pricing.amount) > 0;
    const chargeable = isExtra && s.status !== 'not_performed';
    const unitPrice = isExtra ? Number(s.pricing.amount) : null;
    const quantity =
      isExtra && s.pricing.unit === PriceUnit.PER_HOUR ? stayHours : 1;
    return {
      key: s.key,
      name: s.name,
      pricingType: s.pricing.type,
      unit: isExtra ? s.pricing.unit : null,
      unitPrice,
      quantity,
      subtotal: chargeable ? round2(unitPrice! * quantity) : 0,
      status: s.status ?? 'selected',
    };
  });
  return {
    lines,
    total: round2(lines.reduce((acc, l) => acc + l.subtotal, 0)),
  };
}
