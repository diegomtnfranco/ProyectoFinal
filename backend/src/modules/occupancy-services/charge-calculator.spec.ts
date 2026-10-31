import {
  computeParkingCharge,
  computeServicesCharge,
  nightWindows,
  zonedInstant,
} from './charge-calculator';
import {
  NightRateMode,
  PriceUnit,
  PricingType,
} from '../parking-profiles/parking-profiles.constants';

const TZ = 'America/Argentina/Buenos_Aires';
/** Fecha/hora de pared en Buenos Aires */
const ba = (d: number, h: number, mi = 0) =>
  new Date(zonedInstant(2026, 10, d, h, mi, TZ));
const SPECIAL = {
  mode: NightRateMode.SPECIAL,
  nightAmount: 5000,
  openTime: '08:00',
  closeTime: '20:00',
  toleranceMinutes: 15,
};
const HOURLY = { ...SPECIAL, mode: NightRateMode.HOURLY };
const calc = (inD: Date, outD: Date, policy: any = SPECIAL) =>
  computeParkingCharge({
    checkIn: inD,
    checkOut: outD,
    pricePerHour: 1000,
    policy,
    timeZone: TZ,
  });

describe('computeParkingCharge', () => {
  it('interpreta los horarios en la zona del negocio (20:00 BA = 23:00 UTC)', () => {
    expect(ba(1, 20).toISOString()).toBe('2026-10-01T23:00:00.000Z');
    const [w] = nightWindows(
      ba(1, 19).getTime(),
      ba(1, 21).getTime(),
      '08:00',
      '20:00',
      TZ,
    );
    expect(new Date(w.start).toISOString()).toBe('2026-10-01T23:00:00.000Z');
    expect(new Date(w.end).toISOString()).toBe('2026-10-02T11:00:00.000Z');
  });

  // 1 + regresión: idéntico al cálculo histórico
  it('modo por hora: precio × horas redondeadas hacia arriba, mínimo 1', () => {
    expect(calc(ba(1, 10), ba(1, 12, 30), HOURLY).parkingAmount).toBe(3000);
    expect(calc(ba(1, 10), ba(1, 10, 5), HOURLY).parkingAmount).toBe(1000);
    expect(calc(ba(1, 10), ba(1, 10, 5), null).parkingAmount).toBe(1000);
  });

  // 4 (modo por hora): sigue acumulando horas hasta el egreso real
  it('modo por hora: egreso al día siguiente acumula todas las horas', () => {
    const r = calc(ba(1, 10), ba(2, 10, 30), HOURLY);
    expect(r).toMatchObject({
      mode: 'hourly',
      hourlyHours: 25,
      nights: 0,
      parkingAmount: 25000,
    });
  });

  // 2
  it('especial: egreso antes del cierre se cobra por hora', () => {
    expect(calc(ba(1, 10), ba(1, 19))).toMatchObject({
      nights: 0,
      hourlyHours: 9,
      parkingAmount: 9000,
    });
  });

  it('especial: dentro de los 15 min de tolerancia no se cobra noche', () => {
    expect(calc(ba(1, 10), ba(1, 20, 15))).toMatchObject({
      nights: 0,
      hourlyHours: 11,
      parkingAmount: 11000,
    });
  });

  // 3, 6, 7: importe completo aunque egrese antes de la reapertura y sin cobrar esas horas
  it('especial: pasado cierre + tolerancia cobra la noche completa y no las horas nocturnas', () => {
    const r = calc(ba(1, 10), ba(1, 20, 20));
    expect(r).toMatchObject({
      nights: 1,
      hourlyHours: 10,
      hourlyAmount: 10000,
      nightAmount: 5000,
      parkingAmount: 15000,
    });
  });

  // 4, 5
  it('especial: egreso al día siguiente = horas diurnas + 1 noche', () => {
    const r = calc(ba(1, 10), ba(2, 10, 30));
    // 10–20 (10 h) + 08–10:30 (2,5 h) = 12,5 h → 13 h
    expect(r).toMatchObject({
      nights: 1,
      hourlyHours: 13,
      parkingAmount: 13000 + 5000,
    });
  });

  // 10
  it('especial: más de una noche cobra un importe por noche', () => {
    const r = calc(ba(1, 10), ba(3, 9));
    // 10 h + 12 h + 1 h = 23 h, 2 noches
    expect(r).toMatchObject({
      nights: 2,
      hourlyHours: 23,
      parkingAmount: 23000 + 10000,
    });
  });

  it('especial: ingreso y egreso dentro de la noche = solo el importe nocturno', () => {
    expect(calc(ba(1, 22), ba(2, 7))).toMatchObject({
      nights: 1,
      hourlyHours: 0,
      parkingAmount: 5000,
    });
  });

  it('abierto 24 h (apertura = cierre) no tiene noche', () => {
    expect(
      calc(ba(1, 10), ba(2, 10), {
        ...SPECIAL,
        openTime: '00:00',
        closeTime: '00:00',
      }),
    ).toMatchObject({
      nights: 0,
      parkingAmount: 24000,
    });
  });

  it('cierre después de medianoche (08–02): la noche es 02–08', () => {
    const r = calc(ba(1, 23), ba(2, 3), { ...SPECIAL, closeTime: '02:00' });
    expect(r).toMatchObject({
      nights: 1,
      hourlyHours: 3,
      parkingAmount: 3000 + 5000,
    });
  });

  it('especial sin importe válido se comporta como por hora', () => {
    expect(
      calc(ba(1, 10), ba(2, 10), { ...SPECIAL, nightAmount: null }),
    ).toMatchObject({ mode: 'hourly', parkingAmount: 24000 });
  });
});

describe('computeServicesCharge', () => {
  const svc = (
    key: string,
    type: PricingType,
    amount: number | null,
    unit: PriceUnit | null,
  ) => ({ key, name: key, pricing: { type, amount, unit } });

  // 8, 9
  it('suma solo los adicionales; incluidos y gratuitos no generan cargo', () => {
    const r = computeServicesCharge(
      [
        svc('lavado', PricingType.EXTRA_COST, 2000, PriceUnit.PER_VEHICLE),
        svc('casco', PricingType.EXTRA_COST, 300, PriceUnit.PER_HOUR),
        svc('wifi', PricingType.INCLUDED, null, null),
        svc('aire', PricingType.FREE, null, null),
      ],
      2.5 * 3_600_000,
    );
    expect(r.lines.map((l) => [l.key, l.quantity, l.subtotal])).toEqual([
      ['lavado', 1, 2000],
      ['casco', 3, 900],
      ['wifi', 1, 0],
      ['aire', 1, 0],
    ]);
    expect(r.total).toBe(2900);
  });

  it('sin servicios el total es 0', () => {
    expect(computeServicesCharge([], 1000).total).toBe(0);
  });
});
