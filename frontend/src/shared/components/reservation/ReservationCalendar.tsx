import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** Días clickeables ('YYYY-MM-DD') */
  enabledDates: string[];
  /** Hoy en la zona del estacionamiento ('YYYY-MM-DD') */
  today: string;
  /** Extremo inicial del rango (ingreso) */
  rangeStart?: string;
  /** Extremo final del rango (egreso) */
  rangeEnd?: string;
  /** Día elegido en el paso actual (se marca aunque no haya rango) */
  selected?: string;
  onSelect: (date: string) => void;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');
const key = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parseKey = (k: string) => k.split('-').map(Number) as [number, number, number];

/** Celdas del mes (lunes a domingo), incluyendo días del mes anterior/siguiente */
function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const dt = new Date(Date.UTC(year, month - 1, 1 - offset + i));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    return { key: key(y, m, d), day: d, inMonth: m === month };
  });
}

function ReservationCalendar({ enabledDates, today, rangeStart, rangeEnd, selected, onSelect }: Props) {
  const enabled = new Set(enabledDates);
  const initial = parseKey(selected ?? rangeStart ?? enabledDates[0] ?? today);
  const [view, setView] = useState<{ y: number; m: number }>({ y: initial[0], m: initial[1] });

  // Navegación limitada a los meses que tienen días habilitados
  const months = enabledDates.map((d) => d.slice(0, 7)).sort();
  const firstMonth = months[0] ?? today.slice(0, 7);
  const lastMonth = months[months.length - 1] ?? today.slice(0, 7);
  const current = `${view.y}-${pad(view.m)}`;
  const move = (delta: number) =>
    setView(({ y, m }) => {
      const idx = y * 12 + (m - 1) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });

  const inRange = (k: string) => !!rangeStart && !!rangeEnd && k > rangeStart && k < rangeEnd;
  const isEdge = (k: string) => k === rangeStart || k === rangeEnd || k === selected;
  const hasRange = !!rangeStart && !!rangeEnd && rangeStart !== rangeEnd;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-lg font-bold text-gray-900">
          {MONTHS[view.m - 1]} {view.y}
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={current <= firstMonth}
            onClick={() => move(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={current >= lastMonth}
            onClick={() => move(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-2">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {monthCells(view.y, view.m).map((c) => {
          const isEnabled = c.inMonth && enabled.has(c.key);
          const edge = c.inMonth && isEdge(c.key);
          const between = c.inMonth && inRange(c.key);
          // banda celeste detrás del rango (media celda en los extremos)
          const band =
            hasRange && c.inMonth
              ? between
                ? 'bg-blue-100'
                : c.key === rangeStart
                  ? 'bg-gradient-to-r from-transparent from-50% to-blue-100 to-50%'
                  : c.key === rangeEnd
                    ? 'bg-gradient-to-l from-transparent from-50% to-blue-100 to-50%'
                    : ''
              : '';
          return (
            <div key={c.key} className={`flex h-10 items-center justify-center ${band}`}>
              <button
                type="button"
                disabled={!isEnabled}
                onClick={() => onSelect(c.key)}
                aria-label={c.key}
                aria-pressed={edge}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                  edge
                    ? 'bg-blue-600 text-white'
                    : between
                      ? 'text-blue-700'
                      : !c.inMonth
                        ? 'text-gray-300'
                        : isEnabled
                          ? 'text-gray-900 hover:bg-blue-50'
                          : 'text-gray-300 cursor-not-allowed'
                } ${c.inMonth && c.key === today && !edge ? 'ring-2 ring-blue-600' : ''}`}
              >
                {c.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReservationCalendar;
