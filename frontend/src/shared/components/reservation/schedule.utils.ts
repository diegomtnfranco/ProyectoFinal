/** 'YYYY-MM-DD' de hoy/mañana en la zona del estacionamiento */
const dateKey = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** 'Hoy', 'Mañana' o 'mié 26/11' para una fecha 'YYYY-MM-DD' */
export function formatDayLabel(date: string, timeZone = 'America/Argentina/Buenos_Aires'): string {
  const now = new Date();
  if (date === dateKey(now, timeZone)) return 'Hoy';
  if (date === dateKey(new Date(now.getTime() + 86_400_000), timeZone)) return 'Mañana';
  const [y, m, d] = date.split('-').map(Number);
  // mediodía UTC para que el día de la semana no se corra por zona horaria
  const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
  return `${weekday.replace('.', '')} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}


/** 'YYYY-MM-DD' de hoy en la zona del estacionamiento */
export const todayKey = (timeZone = 'America/Argentina/Buenos_Aires') => dateKey(new Date(), timeZone);

/** 'Mié 26 nov' para una fecha 'YYYY-MM-DD' */
export function formatShortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(dt).replace('.', '');
  const month = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' }).format(dt).replace('.', '');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d} ${month}`;
}

/** '3 h', '1 día', '1 día 2 h' */
export function formatDuration(hours: number): string {
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (!days) return `${rest} h`;
  return `${days} ${days === 1 ? 'día' : 'días'}${rest ? ` ${rest} h` : ''}`;
}
