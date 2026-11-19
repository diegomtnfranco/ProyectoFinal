import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, Loader2, RefreshCw, Wallet as WalletIcon } from 'lucide-react';
import { walletService } from '../../../services/payments.service';
import type { Wallet } from '../../../types/payments.types';
import WalletSummary from '../components/WalletSummary';
import PayablesList from '../components/PayablesList';
import { PaymentsHistory, WalletMovements } from '../components/HistoryLists';

const TABS = [
  { id: 'summary', label: 'Saldo y carga' },
  { id: 'pending', label: 'Pendientes de pago' },
  { id: 'movements', label: 'Movimientos' },
  { id: 'payments', label: 'Pagos' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** Perfil → Información personal → Mi billetera (solo clientes) */
function WalletPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'summary') as TabId;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [walletVersion, setWalletVersion] = useState(0);
  const loadWallet = useCallback(() => setWalletVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    walletService
      .getMine()
      .then((w) => {
        if (!alive) return;
        setWallet(w);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [walletVersion, reloadKey]);

  const refreshAll = () => setReloadKey((k) => k + 1);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/client/profile" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Volver al perfil
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <WalletIcon className="text-blue-600" /> Mi billetera
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">DEMO</span>
        </h1>
        <button onClick={refreshAll} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
          <RefreshCw size={14} /> Actualizar
        </button>
      </header>

      <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <Info size={18} className="shrink-0" />
        Billetera de demostración con dinero ficticio. No es una cuenta bancaria ni saldo de Mercado Pago, y no se transfiere entre ambos.
      </p>

      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Secciones de la billetera">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'summary' &&
        (error ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-red-600">{error}</p>
            <button onClick={loadWallet} className="mt-2 text-sm text-blue-600">Reintentar</button>
          </div>
        ) : wallet ? (
          <WalletSummary wallet={wallet} onChange={(w) => { setWallet(w); setReloadKey((k) => k + 1); }} />
        ) : (
          <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" /></div>
        ))}
      {tab === 'pending' && <PayablesList key={reloadKey} onPaid={loadWallet} />}
      {tab === 'movements' && <WalletMovements reloadKey={reloadKey} />}
      {tab === 'payments' && <PaymentsHistory reloadKey={reloadKey} />}
    </div>
  );
}

export default WalletPage;
