import { useState } from 'react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import PaymentMethodModal, { type PaymentTarget } from '../../../shared/components/payments/PaymentMethodModal';
import { apiDecimalToCents, formatCents } from '../../../shared/components/payments/payment.utils';
import { useToast } from '../../../shared/hooks/useToast';

interface Props {
  reservation: { id: string; status: string; totalAmount?: number | string | null; parkingLotName?: string; vehiclePlate?: string };
  paid: boolean;
  onPaid: () => void;
}

/** Botón "Pagar" para reservas confirmadas (D2). El importe lo vuelve a determinar el backend */
function ReservationPayButton({ reservation, paid, onPaid }: Props) {
  const { showSuccess } = useToast();
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  if (reservation.status !== 'confirmed') return null;

  if (paid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 size={14} /> Pagada
      </span>
    );
  }

  const amountCents = apiDecimalToCents(reservation.totalAmount);
  return (
    <>
      <button
        onClick={() =>
          setTarget({
            obligationType: 'RESERVATION',
            obligationId: reservation.id,
            concept: `Reserva · ${reservation.parkingLotName ?? 'Estacionamiento'}`,
            parkingLotName: reservation.parkingLotName,
            vehiclePlate: reservation.vehiclePlate,
            amountCents: amountCents ?? 0,
          })
        }
        className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        title="Pagar reserva"
      >
        <CreditCard size={16} /> Pagar {amountCents != null && formatCents(amountCents)}
      </button>
      <PaymentMethodModal
        target={target}
        onClose={() => setTarget(null)}
        onPaid={(p) => {
          setTarget(null);
          showSuccess(`Reserva pagada: ${formatCents(p.amountCents)}`);
          onPaid();
        }}
      />
    </>
  );
}

export default ReservationPayButton;
