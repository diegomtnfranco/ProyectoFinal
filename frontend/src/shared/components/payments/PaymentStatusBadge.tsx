import { Ban, CheckCircle2, CircleDashed, Clock, ShieldCheck, XCircle } from 'lucide-react';
import type { PaymentSummaryStatus } from '../../../types/payments.types';
import { statusStyle } from './payment.utils';

const icons = {
  APPROVED: CheckCircle2,
  PENDING: Clock,
  REJECTED: XCircle,
  CANCELLED: Ban,
  NONE: CircleDashed,
  COVERED: ShieldCheck,
} as const;

interface Props {
  status: PaymentSummaryStatus;
  size?: 'sm' | 'md';
}

/** Indicador del estado financiero (independiente del estado de reserva/ocupación) */
function PaymentStatusBadge({ status, size = 'sm' }: Props) {
  const style = statusStyle[status];
  const Icon = icons[status];
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizing} ${style.className}`}>
      <Icon size={size === 'sm' ? 11 : 13} /> {style.label}
    </span>
  );
}

export default PaymentStatusBadge;
