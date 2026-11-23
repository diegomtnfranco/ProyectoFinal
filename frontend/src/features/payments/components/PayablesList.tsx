import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Car, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import { paymentsService } from '../../../services/payments.service';
import type { PayableItem, Payment } from '../../../types/payments.types';
import PaymentMethodModal, { type PaymentTarget } from '../../../shared/components/payments/PaymentMethodModal';
import { formatCents, formatDateTime } from '../../../shared/components/payments/payment.utils';
import { useToast } from '../../../shared/hooks/useToast';

interface Props {
  onPaid: () => void;
}

/** Reservas confirmadas y estadías finalizadas con importe pendiente */
function PayablesList({ onPaid }: Props) {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState<PayableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    paymentsService
      .payable()
      .then((data) => {
        if (!alive) return;
        setItems(data);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [version]);

  const handlePaid = (p: Payment) => {
    setTarget(null);
    showSuccess(`Pago aprobado: ${formatCents(p.amountCents)}`);
    load();
    onPaid();
  };

  const runPendingAction = async (paymentId: string, action: 'sync' | 'cancel') => {
    setActionId(paymentId);
    try {
      const p = action === 'sync' ? await paymentsService.sync(paymentId) : await paymentsService.cancel(paymentId);
      if (p.status === 'APPROVED') showSuccess('Mercado Pago confirmó el pago');
      else if (action === 'cancel') showSuccess('Intento de pago cancelado');
      else showSuccess('El pago sigue pendiente en Mercado Pago');
      load();
      onPaid();
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-gray-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-red-600">{error}</p>
        <button onClick={() => { setLoading(true); load(); }} className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600"><RefreshCw size={14} /> Reintentar</button>
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-green-500" size={36} />
        <p className="mt-2 font-medium text-gray-800">No tenés pagos pendientes</p>
        <p className="text-sm text-gray-500">Las reservas confirmadas y las estadías finalizadas aparecen acá.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((item) => {
          const pending = item.pendingPayment;
          return (
            <li key={`${item.obligationType}:${item.obligationId}`} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-gray-900">
                    {item.obligationType === 'RESERVATION' ? <CalendarCheck size={16} className="text-violet-500" /> : <Car size={16} className="text-blue-500" />}
                    {item.obligationType === 'RESERVATION' ? 'Reserva confirmada' : 'Estadía finalizada'}
                  </p>
                  <p className="text-sm text-gray-600">{item.parkingLotName}{item.vehiclePlate && <> · {item.vehiclePlate}</>}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(item.date)}</p>
                  {item.coveredAmountCents > 0 && (
                    <p className="mt-1 text-xs text-violet-600">
                      Facturado {formatCents(item.billedAmountCents)} − reserva pagada {formatCents(item.coveredAmountCents)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{formatCents(item.amountCents)}</p>
                  {pending ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700"><Clock size={12} /> Pago con Mercado Pago en curso</span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {pending ? (
                  <>
                    <button
                      onClick={() => runPendingAction(pending.id, 'cancel')}
                      disabled={actionId === pending.id}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar intento
                    </button>
                    <button
                      onClick={() => runPendingAction(pending.id, 'sync')}
                      disabled={actionId === pending.id}
                      className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {actionId === pending.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Verificar estado
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() =>
                      setTarget({
                        obligationType: item.obligationType,
                        obligationId: item.obligationId,
                        concept: item.concept,
                        parkingLotName: item.parkingLotName,
                        vehiclePlate: item.vehiclePlate,
                        amountCents: item.amountCents,
                        coveredAmountCents: item.coveredAmountCents,
                        billedAmountCents: item.billedAmountCents,
                      })
                    }
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Pagar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <PaymentMethodModal target={target} onClose={() => setTarget(null)} onPaid={handlePaid} />
    </>
  );
}

export default PayablesList;
