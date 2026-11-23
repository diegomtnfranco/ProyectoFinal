import {
  activeNightWindow,
  dueClosingAlert,
  nextCloseAt,
} from './closing-schedule';
import { zonedInstant } from '../occupancy-services/charge-calculator';
import { normalizePlate } from '../client-vehicles/plate.util';
import { computeServicesCharge } from '../occupancy-services/charge-calculator';
import {
  PriceUnit,
  PricingType,
} from '../parking-profiles/parking-profiles.constants';

const TZ = 'America/Argentina/Buenos_Aires';
const ba = (d: number, h: number, m = 0) => zonedInstant(2026, 10, d, h, m, TZ);

describe('normalizePlate', () => {
  it.each([
    ['ab 123 cd', 'AB123CD'],
    ['AB-123-CD', 'AB123CD'],
    ['ab.123/cd', 'AB123CD'],
    ['  aaa111 ', 'AAA111'],
  ])('%s → %s', (input, out) => expect(normalizePlate(input)).toBe(out));
  it('valores no texto', () => expect(normalizePlate(null)).toBe(''));
});

describe('alertas de cierre', () => {
  it('próximo cierre del día (08–20)', () => {
    expect(nextCloseAt(ba(1, 18, 30), '08:00', '20:00', TZ)).toBe(ba(1, 20));
    expect(nextCloseAt(ba(1, 21), '08:00', '20:00', TZ)).toBe(ba(2, 20));
  });

  it('cierre después de medianoche (08–02)', () => {
    expect(nextCloseAt(ba(1, 23), '08:00', '02:00', TZ)).toBe(ba(2, 2));
  });

  it('24 h no tiene cierre', () => {
    expect(nextCloseAt(ba(1, 10), '00:00', '00:00', TZ)).toBeNull();
  });

  it('60 y 15 minutos antes', () => {
    const close = ba(1, 20);
    expect(dueClosingAlert(ba(1, 18, 59), close)).toBeNull();
    expect(dueClosingAlert(ba(1, 19, 0), close)).toBe('closing_60');
    expect(dueClosingAlert(ba(1, 19, 44), close)).toBe('closing_60');
    expect(dueClosingAlert(ba(1, 19, 45), close)).toBe('closing_15');
    expect(dueClosingAlert(ba(1, 20, 0), close)).toBeNull();
  });

  it('la noche empieza al pasar cierre + 15 min', () => {
    expect(
      activeNightWindow(ba(1, 20, 10), '08:00', '20:00', 15, TZ),
    ).toBeNull();
    const w = activeNightWindow(ba(1, 20, 16), '08:00', '20:00', 15, TZ);
    expect(w).toEqual({ start: ba(1, 20), end: ba(2, 8) });
    expect(activeNightWindow(ba(2, 9), '08:00', '20:00', 15, TZ)).toBeNull();
  });
});

describe('servicios: selección, realización y cobro (40)', () => {
  it('no cobra los marcados como no realizados; sí los seleccionados y realizados', () => {
    const r = computeServicesCharge(
      [
        {
          key: 'a',
          name: 'Lavado',
          pricing: {
            type: PricingType.EXTRA_COST,
            amount: 1000,
            unit: PriceUnit.PER_USE,
          },
          status: 'selected',
        },
        {
          key: 'b',
          name: 'Encerado',
          pricing: {
            type: PricingType.EXTRA_COST,
            amount: 500,
            unit: PriceUnit.PER_USE,
          },
          status: 'performed',
        },
        {
          key: 'c',
          name: 'Pulido',
          pricing: {
            type: PricingType.EXTRA_COST,
            amount: 700,
            unit: PriceUnit.PER_USE,
          },
          status: 'not_performed',
        },
      ],
      3_600_000,
    );
    expect(r.lines.map((l) => [l.key, l.subtotal, l.status])).toEqual([
      ['a', 1000, 'selected'],
      ['b', 500, 'performed'],
      ['c', 0, 'not_performed'],
    ]);
    expect(r.total).toBe(1500);
  });
});
