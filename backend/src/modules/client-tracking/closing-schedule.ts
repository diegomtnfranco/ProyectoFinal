import {
  nightWindows,
  zonedInstant,
} from '../occupancy-services/charge-calculator';

const MIN = 60_000;

const parse = (v: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(v ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Próximo cierre posterior a `now` según el horario diario; null si 24 h o sin horario */
export function nextCloseAt(
  now: number,
  openTime: string,
  closeTime: string,
  timeZone: string,
): number | null {
  const open = parse(openTime);
  const close = parse(closeTime);
  if (open === null || close === null || open === close) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(now))
    .split('-')
    .map(Number);
  for (let add = -1; add <= 2; add++) {
    const t = zonedInstant(
      parts[0],
      parts[1],
      parts[2] + add,
      Math.floor(close / 60),
      close % 60,
      timeZone,
    );
    if (t > now) return t;
  }
  return null;
}

/** Alerta de cierre que corresponde en este momento (60 o 15 minutos antes) */
export function dueClosingAlert(
  now: number,
  closeAt: number,
): 'closing_60' | 'closing_15' | null {
  const left = closeAt - now;
  if (left <= 0) return null;
  if (left <= 15 * MIN) return 'closing_15';
  if (left <= 60 * MIN) return 'closing_60';
  return null;
}

/** Noche en curso si ya pasó cierre + tolerancia (para avisar que empieza la modalidad nocturna) */
export function activeNightWindow(
  now: number,
  openTime: string,
  closeTime: string,
  toleranceMinutes: number,
  timeZone: string,
): { start: number; end: number } | null {
  const windows = nightWindows(
    now - 36 * 60 * MIN,
    now + 1,
    openTime,
    closeTime,
    timeZone,
  );
  return (
    windows.find(
      (w) => now >= w.start + toleranceMinutes * MIN && now < w.end,
    ) ?? null
  );
}

export function formatTime(instant: number, timeZone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(instant));
}
