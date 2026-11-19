import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinanceGranularity, FinanceSeries } from '../../../types/payments.types';
import { formatCents } from '../../../shared/components/payments/payment.utils';

const BAR_COLOR = '#3b82f6'; // azul de la identidad de EstacionApp (una sola serie: sin leyenda)

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function periodLabel(period: string, g: FinanceGranularity, long = false) {
  const [y, m, d] = period.split('-').map(Number);
  if (g === 'month') return long ? `${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]}${m === 1 ? ` ${String(y).slice(2)}` : ''}`;
  if (g === 'week') return long ? `Semana del ${d}/${m}/${y}` : `${d}/${m}`;
  return long ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/** Eje Y: $0, $500, $4k, $1,5M (formato propio, sin mezclar "k" y "K") */
const axisPesos = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `$${(v / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`;
  return `$${v}`;
};

interface Props {
  series: FinanceSeries;
}

/** Ingresos aprobados por período. Hover: tooltip con importe y cantidad de pagos */
function IncomeChart({ series }: Props) {
  const data = series.points.map((p) => ({ ...p, pesos: p.amountCents / 100 }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Gráfico de ingresos aprobados por período">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="period"
            tickFormatter={(v: string) => periodLabel(v, series.granularity)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tickFormatter={axisPesos}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof data)[number];
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-slate-500">{periodLabel(p.period, series.granularity, true)}</p>
                  <p className="text-sm font-bold text-slate-900">{formatCents(p.amountCents)}</p>
                  <p className="text-slate-500">{p.count} {p.count === 1 ? 'pago aprobado' : 'pagos aprobados'}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="pesos" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default IncomeChart;
