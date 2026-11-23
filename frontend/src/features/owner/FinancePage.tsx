import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleDollarSign, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { financeService } from '../../services/payments.service';
import type {
  FinanceGranularity,
  FinancePayment,
  FinanceSeries,
  FinanceSummary,
  Page,
  PaymentStatus,
} from '../../types/payments.types';
import IncomeChart from './finance/IncomeChart';
import PaymentStatusBadge from '../../shared/components/payments/PaymentStatusBadge';
import { formatCents, formatDateTime, methodLabel } from '../../shared/components/payments/payment.utils';

const GRANULARITIES: { value: FinanceGranularity; label: string; hint: string }[] = [
  { value: 'day', label: 'Día', hint: 'Últimos 30 días' },
  { value: 'week', label: 'Semana', hint: 'Últimas 12 semanas' },
  { value: 'month', label: 'Mes', hint: 'Últimos 12 meses' },
];
const STATUS_FILTERS: { value: '' | PaymentStatus; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];
const PAGE_SIZE = 15;

/** Finanzas → Ingresos y pagos (solo PARKING_OWNER). Ingresos = pagos aprobados */
function FinancePage() {
  const [lots, setLots] = useState<{ id: string; name: string }[]>([]);
  const [lotId, setLotId] = useState('');
  const [granularity, setGranularity] = useState<FinanceGranularity>('day');
  const [status, setStatus] = useState<'' | PaymentStatus>('');
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [series, setSeries] = useState<FinanceSeries | null>(null);
  const [payments, setPayments] = useState<Page<FinancePayment> | null>(null);
  const [loading, setLoading] = useState({ summary: true, series: true, payments: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    financeService.lots().then(setLots).catch(() => setLots([]));
  }, []);

  const [version, setVersion] = useState(0);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  // Mientras se recargan los datos se mantienen visibles los anteriores
  useEffect(() => {
    let alive = true;
    financeService
      .summary(lotId)
      .then((d) => {
        if (!alive) return;
        setSummary(d);
        setError(null);
      })
      .catch((e) => alive && fail(e))
      .finally(() => alive && setLoading((l) => ({ ...l, summary: false })));
    return () => {
      alive = false;
    };
  }, [lotId, version]);

  useEffect(() => {
    let alive = true;
    financeService
      .series(granularity, lotId)
      .then((d) => alive && setSeries(d))
      .catch((e) => alive && fail(e))
      .finally(() => alive && setLoading((l) => ({ ...l, series: false })));
    return () => {
      alive = false;
    };
  }, [granularity, lotId, version]);

  useEffect(() => {
    let alive = true;
    financeService
      .payments({ parkingLotId: lotId, status, page, limit: PAGE_SIZE })
      .then((d) => alive && setPayments(d))
      .catch((e) => alive && fail(e))
      .finally(() => alive && setLoading((l) => ({ ...l, payments: false })));
    return () => {
      alive = false;
    };
  }, [lotId, status, page, version]);

  const refresh = () => setVersion((v) => v + 1);

  const tiles = summary
    ? [
        { label: 'Hoy', value: summary.incomeTodayCents },
        { label: 'Esta semana', value: summary.incomeWeekCents },
        { label: 'Últimos 30 días', value: summary.incomeLast30DaysCents },
        { label: 'Histórico', value: summary.incomeTotalCents },
      ]
    : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <CircleDollarSign className="text-blue-600" /> Ingresos y pagos
          </h1>
          <p className="text-sm text-gray-500">Los ingresos suman solo pagos aprobados. Pagos con Mercado Pago en modo Sandbox.</p>
        </div>
        <div className="flex items-center gap-2">
          {lots.length > 1 && (
            <select
              value={lotId}
              onChange={(e) => {
                setLotId(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              aria-label="Estacionamiento"
            >
              <option value="">Todos mis estacionamientos</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}
          <button onClick={refresh} className="rounded-xl border border-gray-300 bg-white p-2 text-gray-500 hover:text-blue-600" aria-label="Actualizar">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Resumen */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading.summary && !summary
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />)
          : tiles.map((t) => (
              <div key={t.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">{t.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatCents(t.value)}</p>
              </div>
            ))}
      </section>

      {summary && (
        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium text-gray-700">Pagos por estado</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5"><PaymentStatusBadge status="APPROVED" size="md" /> <b>{summary.counts.approved}</b></span>
              <span className="flex items-center gap-1.5"><PaymentStatusBadge status="PENDING" size="md" /> <b>{summary.counts.pending}</b></span>
              <span className="flex items-center gap-1.5"><PaymentStatusBadge status="REJECTED" size="md" /> <b>{summary.counts.rejected}</b></span>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium text-gray-700">Ingresos por medio</p>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-gray-500">Billetera</dt><dd className="font-semibold">{formatCents(summary.byMethodCents.wallet)}</dd></div>
              <div><dt className="text-gray-500">Mercado Pago</dt><dd className="font-semibold">{formatCents(summary.byMethodCents.mercadoPago)}</dd></div>
              <div><dt className="text-gray-500">Presencial</dt><dd className="font-semibold">{formatCents(summary.byMethodCents.presential)}</dd></div>
            </dl>
          </div>
        </section>
      )}

      {/* Gráfico */}
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-gray-900">Ingresos aprobados</h2>
            <p className="text-xs text-gray-500">{GRANULARITIES.find((g) => g.value === granularity)?.hint}</p>
          </div>
          <div className="inline-flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Período">
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGranularity(g.value)}
                aria-pressed={granularity === g.value}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${granularity === g.value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        {loading.series && !series ? (
          <div className="flex h-64 items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : series && series.points.some((p) => p.amountCents > 0) ? (
          <IncomeChart series={series} />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-gray-400">
            <Inbox size={32} />
            <p className="mt-2 text-sm">Sin ingresos aprobados en este período</p>
          </div>
        )}
      </section>

      {/* Historial */}
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">Pagos recibidos</h2>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${status === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading.payments && !payments ? (
          <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : !payments?.items.length ? (
          <div className="py-10 text-center text-gray-500"><Inbox className="mx-auto mb-2 text-gray-300" size={32} />No hay pagos para mostrar</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Fecha y hora</th>
                    <th className="py-2 pr-3 font-medium">Patente</th>
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    {!lotId && lots.length > 1 && <th className="py-2 pr-3 font-medium">Estacionamiento</th>}
                    <th className="py-2 pr-3 font-medium">Concepto</th>
                    <th className="py-2 pr-3 text-right font-medium">Importe</th>
                    <th className="py-2 pr-3 font-medium">Medio</th>
                    <th className="py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.items.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-gray-600">{formatDateTime(p.createdAt)}</td>
                      <td className="py-2.5 pr-3"><span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold">{p.vehiclePlate ?? '—'}</span></td>
                      <td className="py-2.5 pr-3 text-gray-700">{p.clientName ?? <span className="text-gray-400">Sin registrar</span>}</td>
                      {!lotId && lots.length > 1 && <td className="py-2.5 pr-3 text-gray-600">{p.parkingLotName}</td>}
                      <td className="py-2.5 pr-3 text-gray-600">{p.obligationType === 'RESERVATION' ? 'Reserva' : p.coveredAmountCents > 0 ? 'Estadía (resto)' : 'Estadía'}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-gray-900">{formatCents(p.amountCents)}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{methodLabel[p.method]}</td>
                      <td className="py-2.5"><PaymentStatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <ul className="space-y-2 md:hidden">
              {payments.items.map((p) => (
                <li key={p.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold">{p.vehiclePlate ?? '—'}</span>
                      <p className="mt-1 text-sm text-gray-700">{p.clientName ?? 'Cliente sin registrar'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(p.createdAt)} · {methodLabel[p.method]}</p>
                      <p className="text-xs text-gray-500">{p.parkingLotName} · {p.obligationType === 'RESERVATION' ? 'Reserva' : 'Estadía'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCents(p.amountCents)}</p>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border p-1.5 disabled:opacity-40" aria-label="Anterior"><ChevronLeft size={16} /></button>
              <span className="text-gray-500">Página {page} · {payments.total} pagos</span>
              <button disabled={!payments.hasMore} onClick={() => setPage(page + 1)} className="rounded-lg border p-1.5 disabled:opacity-40" aria-label="Siguiente"><ChevronRight size={16} /></button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default FinancePage;
