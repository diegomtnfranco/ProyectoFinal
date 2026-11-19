import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, Wallet as WalletIcon, X } from 'lucide-react';
import { paymentsService, walletService, newIdempotencyKey } from '../../../services/payments.service';
import { PaymentApiError, type ObligationType, type Payment, type PaymentsConfig } from '../../../types/payments.types';
import { formatCents } from './payment.utils';

export interface PaymentTarget {
  obligationType: ObligationType;
  obligationId: string;
  concept: string;
  parkingLotName?: string | null;
  vehiclePlate?: string | null;
  /** Importe informado por el backend (solo para mostrar: el backend vuelve a calcularlo) */
  amountCents: number;
  coveredAmountCents?: number;
  billedAmountCents?: number;
}

interface Props {
  target: PaymentTarget | null;
  onClose: () => void;
  onPaid: (payment: Payment) => void;
}

type Method = 'WALLET' | 'MERCADO_PAGO';

/**
 * Selector de medio de pago: Saldo EstacionApp (demo) o Mercado Pago (Sandbox).
 * El frontend solo envía qué se paga; importe, estado y dueño los decide el backend.
 */
function PaymentMethodModal({ target, onClose, onPaid }: Props) {
  if (!target) return null;
  // key: cada operación abre un diálogo con estado nuevo
  return <PaymentDialog key={`${target.obligationType}:${target.obligationId}`} target={target} onClose={onClose} onPaid={onPaid} />;
}

function PaymentDialog({ target, onClose, onPaid }: Props & { target: PaymentTarget }) {
  const [method, setMethod] = useState<Method>('WALLET');
  const [balance, setBalance] = useState<number | null>(null);
  const [config, setConfig] = useState<PaymentsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficient, setInsufficient] = useState(false);
  // Una clave por intento: si la red falla y se reintenta, el backend no debita dos veces
  const idemKey = useRef<string>(newIdempotencyKey());

  useEffect(() => {
    let alive = true;
    Promise.all([walletService.getMine(), paymentsService.config()])
      .then(([w, c]) => {
        if (!alive) return;
        setBalance(w.balanceCents);
        setConfig(c);
        if (w.balanceCents < target.amountCents) setInsufficient(true);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'No se pudo cargar tu saldo'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [target.amountCents]);

  const mpEnabled = !!config?.mercadoPagoEnabled;
  const walletShort = balance != null && balance < target.amountCents;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      if (method === 'WALLET') {
        const res = await paymentsService.payWithWallet(target.obligationType, target.obligationId, idemKey.current);
        setBalance(res.walletBalanceCents);
        onPaid(res.payment);
      } else {
        const res = await paymentsService.startMercadoPago(target.obligationType, target.obligationId);
        // Redirección al checkout de prueba; el resultado se valida en el backend
        window.location.assign(res.redirectUrl);
        return;
      }
    } catch (e) {
      if (e instanceof PaymentApiError && e.code === 'INSUFFICIENT_FUNDS') {
        setInsufficient(true);
        setBalance(typeof e.data.balanceCents === 'number' ? e.data.balanceCents : balance);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      idemKey.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pagar</h2>
            <p className="text-sm text-gray-500">
              {target.concept}
              {target.vehiclePlate && <> · {target.vehiclePlate}</>}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-blue-50 p-4 text-center">
            <p className="text-xs text-blue-700">Importe a pagar</p>
            <p className="text-3xl font-bold text-blue-900">{formatCents(target.amountCents)}</p>
            {!!target.coveredAmountCents && (
              <p className="mt-1 text-xs text-blue-700">
                Total facturado {formatCents(target.billedAmountCents)} · ya pagado con la reserva {formatCents(target.coveredAmountCents)}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-6 text-gray-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">Medio de pago</legend>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${method === 'WALLET' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'}`}
              >
                <input type="radio" name="method" checked={method === 'WALLET'} onChange={() => setMethod('WALLET')} />
                <WalletIcon size={20} className="text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Saldo EstacionApp <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">DEMO</span>
                  </p>
                  <p className={`text-xs ${walletShort ? 'text-red-600' : 'text-gray-500'}`}>
                    Disponible: {formatCents(balance)}
                  </p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 rounded-xl border p-3 ${mpEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${method === 'MERCADO_PAGO' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'}`}
              >
                <input
                  type="radio"
                  name="method"
                  disabled={!mpEnabled}
                  checked={method === 'MERCADO_PAGO'}
                  onChange={() => setMethod('MERCADO_PAGO')}
                />
                <ExternalLink size={20} className="text-sky-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Mercado Pago <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">SANDBOX</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {mpEnabled ? 'Entorno de prueba: no se cobra dinero real' : 'No disponible en este momento'}
                  </p>
                </div>
              </label>
            </fieldset>
          )}

          {insufficient && method === 'WALLET' && (
            <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={18} className="shrink-0" />
              <span>
                Tu saldo no alcanza (no se permiten pagos parciales).{' '}
                {mpEnabled ? 'Elegí Mercado Pago o cargá dinero demo en Mi billetera.' : 'Cargá dinero demo en Mi billetera.'}
              </span>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
          {target.obligationType === 'RESERVATION' && (
            <p className="text-xs text-gray-500">Las reservas pagadas no tienen reintegro si se cancelan.</p>
          )}
        </div>

        <footer className="flex gap-2 border-t border-gray-100 p-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={busy || loading || (method === 'WALLET' && walletShort) || (method === 'MERCADO_PAGO' && !mpEnabled)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            {method === 'WALLET' ? 'Pagar con saldo' : 'Ir a Mercado Pago'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default PaymentMethodModal;
