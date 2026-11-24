import {
  HOUR_MS,
  ScheduleSettings,
  SpaceBusy,
  entrySlots,
  exitSlots,
  openWindows,
  quote,
  validateEntry,
  validateExit,
} from './reservation-schedule';

const TZ = 'America/Argentina/Buenos_Aires'; // UTC-3, sin horario de verano
/** instante para una hora local de Buenos Aires */
const ar = (iso: string) => new Date(`${iso}-03:00`).getTime();

const settings: ScheduleSettings = {
  openTime: '08:00:00',
  closeTime: '20:00:00',
  timeZone: TZ,
  maxAdvanceDays: 7,
  maxReservationHours: 24,
};

const space = (id: string, busy: Array<[string, string]> = [], occupied = false): SpaceBusy => ({
  spaceId: id,
  spaceNumber: id,
  currentlyOccupied: occupied,
  busy: busy.map(([a, b]) => ({ start: ar(a), end: ar(b) })),
});

const labels = (days: { date: string; slots: { label: string }[] }[], date: string) =>
  days.find(d => d.date === date)?.slots.map(s => s.label) ?? [];

describe('reservation-schedule', () => {
  describe('openWindows', () => {
    it('horario diurno: un tramo por día', () => {
      const w = openWindows(ar('2026-11-24T00:00'), ar('2026-11-24T23:59'), '08:00', '20:00', TZ);
      expect(w).toEqual([{ start: ar('2026-11-24T08:00'), end: ar('2026-11-24T20:00') }]);
    });

    it('cierre después de medianoche', () => {
      const w = openWindows(ar('2026-11-24T12:00'), ar('2026-11-24T23:00'), '18:00', '02:00', TZ);
      expect(w).toContainEqual({ start: ar('2026-11-24T18:00'), end: ar('2026-11-25T02:00') });
    });

    it('24 h: fusiona los tramos contiguos', () => {
      const w = openWindows(ar('2026-11-24T10:00'), ar('2026-11-26T10:00'), '00:00', '00:00', TZ);
      expect(w).toHaveLength(1);
    });
  });

  describe('entrySlots', () => {
    it('mismo día: solo horas en punto con >= 1 h de anticipación', () => {
      const now = ar('2026-11-24T10:20');
      const days = entrySlots(now, settings, [space('A1')], 2 * HOUR_MS);
      // 10:20 + 1 h = 11:20 -> primera hora en punto 12:00; último ingreso 19:00 (1 h antes del cierre)
      expect(labels(days, '2026-11-24')).toEqual([
        '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
      ]);
    });

    it('otro día: todo el horario de atención y marcado como programado si faltan >= 24 h', () => {
      const now = ar('2026-11-24T10:20');
      const days = entrySlots(now, settings, [space('A1')], 2 * HOUR_MS);
      const tomorrow = days.find(d => d.date === '2026-11-25')!;
      expect(tomorrow.slots[0].label).toBe('08:00');
      expect(tomorrow.slots[tomorrow.slots.length - 1].label).toBe('19:00');
      expect(tomorrow.slots.find(s => s.label === '10:00')!.scheduled).toBe(false); // 23:40 h
      expect(tomorrow.slots.find(s => s.label === '11:00')!.scheduled).toBe(true); // 24:40 h
    });

    it('si el estacionamiento ya cerró hoy no devuelve horarios de hoy', () => {
      const now = ar('2026-11-24T19:30');
      const days = entrySlots(now, settings, [space('A1')], 2 * HOUR_MS);
      expect(labels(days, '2026-11-24')).toEqual([]);
      expect(days[0].date).toBe('2026-11-25');
    });

    it('no supera los días máximos de anticipación', () => {
      const now = ar('2026-11-24T10:00');
      const days = entrySlots(now, { ...settings, maxAdvanceDays: 2 }, [space('A1')], 2 * HOUR_MS);
      expect(days.map(d => d.date)).toEqual(['2026-11-24', '2026-11-25', '2026-11-26']);
      expect(labels(days, '2026-11-26').pop()).toBe('10:00');
    });

    it('excluye horarios sin espacios libres', () => {
      const now = ar('2026-11-24T06:00');
      const days = entrySlots(now, settings, [space('A1', [['2026-11-24T12:00', '2026-11-24T15:00']])], 2 * HOUR_MS);
      const today = labels(days, '2026-11-24');
      expect(today).toContain('11:00');
      expect(today).not.toContain('12:00');
      expect(today).not.toContain('14:00');
      expect(today).toContain('15:00');
    });

    it('un espacio ocupado ahora no sirve para ingresos inminentes pero sí para los futuros', () => {
      const now = ar('2026-11-24T10:00');
      const days = entrySlots(now, settings, [space('A1', [], true)], 2 * HOUR_MS);
      const today = labels(days, '2026-11-24');
      expect(today).not.toContain('11:00');
      expect(today).toContain('12:00');
    });
  });

  describe('exitSlots', () => {
    it('ofrece egresos dentro del horario de atención, incluso al día siguiente', () => {
      const now = ar('2026-11-24T10:00');
      const days = exitSlots(now, ar('2026-11-24T18:00'), settings, [space('A1')], 2 * HOUR_MS);
      expect(labels(days, '2026-11-24')).toEqual(['19:00', '20:00']);
      // al otro día desde la apertura hasta cumplir 24 h (18:00)
      expect(labels(days, '2026-11-25')[0]).toBe('08:00');
      expect(labels(days, '2026-11-25').pop()).toBe('18:00');
    });

    it('corta los egresos cuando el espacio deja de estar libre', () => {
      const now = ar('2026-11-24T06:00');
      const days = exitSlots(
        now,
        ar('2026-11-24T09:00'),
        settings,
        [space('A1', [['2026-11-24T12:00', '2026-11-24T14:00']])],
        2 * HOUR_MS,
      );
      expect(labels(days, '2026-11-24')).toEqual(['10:00', '11:00', '12:00']);
    });
  });

  describe('validaciones', () => {
    const now = ar('2026-11-24T10:20');
    it('rechaza minutos', () => {
      expect(validateEntry(now, ar('2026-11-25T10:30'), settings)).toMatch(/hora en punto/);
      expect(validateExit(ar('2026-11-25T10:00'), ar('2026-11-25T12:15'), settings)).toMatch(/hora en punto/);
    });
    it('exige 1 h de anticipación', () => {
      expect(validateEntry(now, ar('2026-11-24T11:00'), settings)).toMatch(/1 h/);
      expect(validateEntry(now, ar('2026-11-24T12:00'), settings)).toBeNull();
    });
    it('rechaza fuera del horario de atención', () => {
      expect(validateEntry(now, ar('2026-11-25T07:00'), settings)).toMatch(/fuera del horario/);
      expect(validateEntry(now, ar('2026-11-25T20:00'), settings)).toMatch(/fuera del horario/);
      expect(validateExit(ar('2026-11-25T10:00'), ar('2026-11-25T21:00'), settings)).toMatch(/fuera del horario/);
      expect(validateExit(ar('2026-11-25T10:00'), ar('2026-11-25T20:00'), settings)).toBeNull();
    });
  });

  describe('quote', () => {
    it('aplica la tarifa diferencial solo a reservas programadas (>= 24 h)', () => {
      const now = ar('2026-11-24T10:00');
      expect(quote(now, ar('2026-11-24T12:00'), ar('2026-11-24T15:00'), 1000, 10)).toEqual({
        hours: 3, baseAmount: 3000, discountPercent: 0, totalAmount: 3000, scheduled: false,
      });
      expect(quote(now, ar('2026-11-25T10:00'), ar('2026-11-25T13:00'), 1000, 10)).toEqual({
        hours: 3, baseAmount: 3000, discountPercent: 10, totalAmount: 2700, scheduled: true,
      });
    });
  });
});
