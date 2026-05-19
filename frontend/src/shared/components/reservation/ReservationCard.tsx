import { Reservation } from '../../types/reservation.types';
import { formatDateTime } from '../../utils/formatters';
import { Check, AlertCircle, Clock, DollarSign } from 'lucide-react';

interface ReservationCardProps {
  reservation: Reservation;
}

const ReservationCard: React.FC<ReservationCardProps> = ({ reservation }) => {
  const statusStyles = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-600',
    expired: 'bg-red-100 text-red-700'
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{reservation.parkingLotName}</h3>
          <p className="mt-2 text-sm text-slate-600">{reservation.vehicleType.toUpperCase()} — {reservation.plateNumber}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[reservation.status]}`}>
          {reservation.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
          <span className="flex items-center gap-2"><Clock size={16} /> {formatDateTime(reservation.startDate)}</span>
          <span className="mt-2 flex items-center gap-2"><Clock size={16} /> {formatDateTime(reservation.endDate)}</span>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
          <span className="flex items-center gap-2"><DollarSign size={16} /> Total</span>
          <p className="mt-2 text-xl font-semibold text-slate-900">${reservation.totalPrice}</p>
        </div>
      </div>
    </article>
  );
};

export default ReservationCard;
