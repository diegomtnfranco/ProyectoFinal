import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import { paymentsService, walletService } from '../../../services/payments.service';
import type { Page, Payment, WalletTransaction } from '../../../types/payments.types';
import PaymentStatusBadge from '../../../shared/components/payments/PaymentStatusBadge';
import { formatCents, formatDateTime, methodLabel } from '../../../shared/components/payments/payment.utils';

const PAGE_SIZE = 10;

function usePaged<T>(fetcher: (page: number) => Promise<Page<T>>, reloadKey: number) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Mientras carga la página siguiente se mantiene visible la anterior
    fetcher(page)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, reloadKey]);

  return { page, setPage, data, loading, error };
}

function Pager({ page, hasMore, onPage }: { page: number; hasMore: boolean; onPage: (p: number) => void }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border p-1.5 disabled:opacity-40" aria-label="Anterior">
        <ChevronLeft size={16} />
      </button>
      <span className="text-gray-500">Página {page}</span>
      <button disabled={!hasMore} onClick={() => onPage(page + 1)} className="rounded-lg border p-1.5 disabled:opacity-40" aria-label="Siguiente">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function State({ loading, error, empty, emptyText }: { loading: boolean; error: string | null; empty: boolean; emptyText: string }) {
  if (loading) return <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" /></div>;
  if (error) return <p className="py-6 text-center text-red-600">{error}</p>;
  if (empty)
    return (
      <div className="py-10 text-center text-gray-500">
        <Inbox className="mx-auto mb-2 text-gray-300" size={32} />
        {emptyText}
      </div>
    );
  return null;
}

/** Movimientos de la billetera: cargas demo (crédito) y pagos (débito). Solo lectura */
export function WalletMovements({ reloadKey }: { reloadKey: number }) {
  const { page, setPage, data, loading, error } = usePaged<WalletTransaction>((p) => walletService.transactions(p, PAGE_SIZE), reloadKey);
  const items = data?.items ?? [];
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <State loading={loading} error={error} empty={!items.length} emptyText="Todavía no hay movimientos" />
      {!loading && !error && items.length > 0 && (
        <>
          <ul className="divide-y divide-gray-100">
            {items.map((t) => {
              const credit = t.type === 'CREDIT';
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${credit ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {credit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{t.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(t.createdAt)} · {credit ? 'Crédito' : 'Débito'} · {t.kind === 'DEMO_TOPUP' ? 'Carga demo' : 'Pago'}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400" title={t.id}>ID {t.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                      {credit ? '+' : '−'}{formatCents(t.amountCents)}
                    </p>
                    <p className="text-[11px] text-gray-400">Saldo {formatCents(t.balanceAfterCents)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pager page={page} hasMore={!!data?.hasMore} onPage={setPage} />
        </>
      )}
    </section>
  );
}

/** Pagos de estacionamiento (separados de las cargas de dinero) */
export function PaymentsHistory({ reloadKey }: { reloadKey: number }) {
  const { page, setPage, data, loading, error } = usePaged<Payment>((p) => paymentsService.listMine(p, PAGE_SIZE), reloadKey);
  const items = data?.items ?? [];
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <State loading={loading} error={error} empty={!items.length} emptyText="Todavía no realizaste pagos" />
      {!loading && !error && items.length > 0 && (
        <>
          <ul className="divide-y divide-gray-100">
            {items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{p.parkingLotName ?? 'Estacionamiento'}</p>
                  <p className="text-sm text-gray-600">
                    {p.obligationType === 'RESERVATION' ? 'Reserva' : 'Estadía'}
                    {p.vehiclePlate && <> · {p.vehiclePlate}</>}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(p.createdAt)} · {methodLabel[p.method]}</p>
                  <p className="font-mono text-[10px] text-gray-400" title={p.id}>ID {p.id.slice(0, 8)}{p.externalPaymentId && ` · MP ${p.externalPaymentId}`}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCents(p.amountCents)}</p>
                  <PaymentStatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
          <Pager page={page} hasMore={!!data?.hasMore} onPage={setPage} />
        </>
      )}
    </section>
  );
}
