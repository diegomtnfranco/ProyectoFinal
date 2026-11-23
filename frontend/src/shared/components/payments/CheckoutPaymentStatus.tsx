import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { paymentsService } from '../../../services/payments.service';
import type { PaymentSummary } from '../../../types/payments.types';
import ActivityPaymentInfo from './ActivityPaymentInfo';

interface Props {
  parkingLotId: string;
  occupancyId: string;
  vehiclePlate: string;
}

/**
 * Importe final y estado del pago al registrar un egreso (dueño/empleado).
 * El importe y el estado los informa el backend; desde acá también se puede
 * registrar un pago presencial.
 */
function CheckoutPaymentStatus({ parkingLotId, occupancyId, vehiclePlate }: Props) {
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    paymentsService
      .staffStatus(parkingLotId, { occupancyId })
      .then((p) => alive && setPayment(p))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [parkingLotId, occupancyId]);

  if (failed) return <p className="text-xs text-gray-500">No se pudo consultar el estado del pago.</p>;
  if (!payment) {
    return (
      <p className="flex items-center gap-2 text-xs text-gray-500">
        <Loader2 size={14} className="animate-spin" /> Consultando el pago…
      </p>
    );
  }
  return (
    <ActivityPaymentInfo
      payment={payment}
      obligationType="OCCUPANCY"
      obligationId={occupancyId}
      vehiclePlate={vehiclePlate}
    />
  );
}

export default CheckoutPaymentStatus;
