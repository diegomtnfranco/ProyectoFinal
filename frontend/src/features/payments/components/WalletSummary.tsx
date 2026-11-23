import { useState } from 'react';
import { CalendarDays, Loader2, PlusCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { newIdempotencyKey, walletService } from '../../../services/payments.service';
import type { Wallet } from '../../../types/payments.types';
import { formatCents, formatDateTime, parsePesosToCents } from '../../../shared/components/payments/payment.utils';
import { useToast } from '../../../shared/hooks/useToast';

const PRESETS = [500_000, 1_000_000, 2_000_000]; // $5.000 / $10.000 / $20.000

interface Props {
  wallet: Wallet;
  onChange: (wallet: Wallet) => void;
}

/** Saldo, totales y carga simulada (no usa Mercado Pago ni dinero real) */
function WalletSummary({ wallet, onChange }: Props) {
  const { showSuccess, showError } = useToast();
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState<number | 'custom' | null>(null);

  const topUp = async (amountCents: number, source: number | 'custom') => {
    setBusy(source);
    try {
      const res = await walletService.topUp(amountCents, newIdempotencyKey());
      onChange(res.wallet);
      setCustom('');
      showSuccess(`Se cargaron ${formatCents(amountCents)} de dinero demo`);
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const customCents = parsePesosToCents(custom);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-sm">
        <p className="text-sm text-blue-100">Saldo disponible</p>
        <p className="mt-1 text-4xl font-bold">{formatCents(wallet.balanceCents)}</p>
        <p className="mt-1 text-xs text-blue-200">Moneda: {wallet.currency} · dinero de demostración</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/10 p-3">
            <dt className="flex items-center gap-1 text-blue-100"><TrendingUp size={14} /> Total cargado</dt>
            <dd className="font-semibold">{formatCents(wallet.totalLoadedCents)}</dd>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <dt className="flex items-center gap-1 text-blue-100"><TrendingDown size={14} /> Total utilizado</dt>
            <dd className="font-semibold">{formatCents(wallet.totalSpentCents)}</dd>
          </div>
        </dl>
        <p className="mt-4 flex items-center gap-1 text-xs text-blue-200">
          <CalendarDays size={12} /> Creada el {formatDateTime(wallet.createdAt)}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <PlusCircle size={18} className="text-blue-600" /> Cargar dinero demo
        </h3>
        <p className="mt-1 text-sm text-gray-500">Carga simulada: no se realiza ningún cobro real.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {PRESETS.map((cents) => (
            <button
              key={cents}
              onClick={() => topUp(cents, cents)}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1 rounded-xl border border-blue-200 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {busy === cents ? <Loader2 size={16} className="animate-spin" /> : formatCents(cents)}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (customCents) topUp(customCents, 'custom');
          }}
        >
          <label className="sr-only" htmlFor="custom-topup">Importe personalizado</label>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              id="custom-topup"
              inputMode="decimal"
              placeholder="Otro importe"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-7 pr-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!customCents || busy !== null}
            className="rounded-xl bg-blue-600 px-4 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === 'custom' ? <Loader2 size={16} className="animate-spin" /> : 'Cargar'}
          </button>
        </form>
        {custom && !customCents && <p className="mt-1 text-xs text-red-600">Ingresá un importe válido (ej: 7500 o 7500,50)</p>}
        <p className="mt-2 text-xs text-gray-400">Entre $100 y $500.000 por carga.</p>
      </section>
    </div>
  );
}

export default WalletSummary;
