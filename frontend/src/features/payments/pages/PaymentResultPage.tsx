import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { paymentsService } from '../../../services/payments.service';
import type { Payment } from '../../../types/payments.types';
import { formatCents, methodLabel } from '../../../shared/components/payments/payment.utils';

const MAX_POLLS = 6;

/**
 * Retorno desde Mercado Pago. Los parámetros que agrega Mercado Pago a la URL
 * se ignoran: solo se usa el id interno y se le pide al backend que verifique
 * el estado con la API de Mercado Pago.
 */
function PaymentResultPage() {
  const [params] = useSearchParams();
  const paymentId = params.get('paymentId') ?? params.get('external_reference') ?? '';
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(!!paymentId);
  const polls = useRef(0);

  const check = useCallback(async () => {
    if (!paymentId) return;
    try {
      const p = await paymentsService.sync(paymentId);
      setPayment(p);
      setError(null);
      return p;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      const p = await check();
      polls.current += 1;
      // Mientras siga pendiente se reconsulta unas veces (el webhook puede tardar)
      if (p?.status === 'PENDING' && polls.current < MAX_POLLS) timer = setTimeout(loop, 4000);
    };
    loop();
    return () => clearTimeout(timer);
  }, [paymentId, check]);

  const status = payment?.status;
  const view =
    status === 'APPROVED'
      ? { icon: CheckCircle2, color: 'text-green-500', title: 'Pago aprobado', text: 'Mercado Pago confirmó el pago.' }
      : status === 'REJECTED'
        ? { icon: XCircle, color: 'text-red-500', title: 'Pago rechazado', text: 'Podés intentarlo de nuevo o pagar con tu saldo.' }
        : status === 'CANCELLED'
          ? { icon: XCircle, color: 'text-slate-400', title: 'Pago cancelado', text: 'La operación no se completó.' }
          : { icon: Clock, color: 'text-amber-500', title: 'Pago pendiente', text: 'Todavía no recibimos la confirmación de Mercado Pago.' };
  const Icon = view.icon;

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        {!paymentId ? (
          <p className="text-gray-600">No se encontró la operación de pago.</p>
        ) : !payment && checking ? (
          <>
            <Loader2 className="mx-auto animate-spin text-blue-500" size={40} />
            <p className="mt-3 text-gray-600">Verificando el pago con Mercado Pago…</p>
          </>
        ) : error && !payment ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <Icon className={`mx-auto ${view.color}`} size={48} />
            <h1 className="mt-3 text-xl font-bold text-gray-900">{view.title}</h1>
            <p className="mt-1 text-gray-600">{view.text}</p>
            {payment && (
              <dl className="mt-5 space-y-1 rounded-xl bg-gray-50 p-4 text-left text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Concepto</dt><dd className="font-medium">{payment.concept}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Importe</dt><dd className="font-medium">{formatCents(payment.amountCents)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Medio</dt><dd className="font-medium">{methodLabel[payment.method]} (Sandbox)</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Operación</dt><dd className="font-mono text-xs">{payment.id.slice(0, 8)}</dd></div>
              </dl>
            )}
            {status === 'PENDING' && (
              <button onClick={() => { setChecking(true); check(); }} disabled={checking} className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 disabled:opacity-50">
                <RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> Volver a verificar
              </button>
            )}
          </>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/client/wallet?tab=payments" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Ver mis pagos
          </Link>
          <Link to="/client/my-reservations" className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Mis reservas
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentResultPage;
