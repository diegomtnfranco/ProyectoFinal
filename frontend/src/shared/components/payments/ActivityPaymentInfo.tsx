import { useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import { paymentsService } from '../../../services/payments.service';
import type { ObligationType, PaymentSummary } from '../../../types/payments.types';
import { ConfirmModal } from '../common/ConfirmModal';
import PaymentStatusBadge from './PaymentStatusBadge';
import { formatCents, methodLabel } from './payment.utils';

interface Props {
  payment: PaymentSummary;
  obligationType: ObligationType;
  obligationId: string;
  vehiclePlate: string;
}

/**
 * Bloque de pago dentro de las tarjetas de actividad (dueño/empleado).
 * Muestra importe, medio y estado según el backend. Si no hay pago, permite
 * registrar un cobro presencial para que no se le pida el pago al cliente.
 * Diseño: recuadro inferior de la "Tarjeta de actividad · expandida".
 */
function ActivityPaymentInfo({ payment: initial, obligationType, obligationId, vehiclePlate }: Props) {
  const [payment, setPayment] = useState<PaymentSummary>(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRegister =
    (payment.status === 'NONE' || payment.status === 'REJECTED' || payment.status === 'CANCELLED') &&
    (payment.amountCents ?? payment.billedAmountCents ?? 0) > 0;

  const register = async () => {
    setConfirming(false);
    setBusy(true);
    setError(null);
    try {
      const p = await paymentsService.registerPresential(obligationType, obligationId);
      setPayment({
        status: p.status,
        method: p.method,
        amountCents: p.amountCents,
        billedAmountCents: p.billedAmountCents,
        coveredAmountCents: p.coveredAmountCents,
        paymentId: p.id,
        updatedAt: p.updatedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // Recuadro cálido cuando falta cobrar; neutro en el resto de los casos
  const boxTone = canRegister ? 'border-[#F3D9D4] bg-[#FFFAF8]' : 'border-[#E7E5E4] bg-[#FAFAF9]';

  return (
    <div className={`flex min-h-[88px] flex-col justify-center gap-3 rounded-xl border p-3.5 ${boxTone}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-medium text-[#6B6560]">Pago</span>
          <span className="text-base font-bold tabular-nums text-[#1C1917]">
            {payment.amountCents != null && payment.status !== 'COVERED' ? formatCents(payment.amountCents) : '—'}
            {payment.method && <span className="text-sm font-normal text-[#6B6560]"> · {methodLabel[payment.method]}</span>}
          </span>
          {payment.coveredAmountCents > 0 && payment.status !== 'COVERED' && (
            <span className="text-xs text-[#6D28D9]">Reserva pagada: {formatCents(payment.coveredAmountCents)}</span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="self-start sm:self-auto">
            <PaymentStatusBadge status={payment.status} size="md" />
          </span>
          {canRegister && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] bg-[#F7931E] px-4 text-sm font-bold text-[#2E1A00]
                transition-[background-color,box-shadow,transform] duration-150 ease-out
                hover:-translate-y-px hover:bg-[#E8800A] hover:shadow-[0_4px_12px_rgba(232,128,10,0.3)]
                active:translate-y-0 active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8800A] focus-visible:ring-offset-1
                disabled:pointer-events-none disabled:opacity-60
                motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Banknote size={18} aria-hidden="true" />}
              Registrar pago presencial
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-[#B42318]">{error}</p>}

      <ConfirmModal
        isOpen={confirming}
        title="Registrar pago presencial"
        message={`¿Confirmás que el vehículo ${vehiclePlate} pagó ${formatCents(payment.amountCents)} en el estacionamiento? No se le pedirá el pago en la app.`}
        confirmText="Registrar"
        variant="info"
        onConfirm={register}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

export default ActivityPaymentInfo;
