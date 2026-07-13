import type { Reservation } from '../../../types/parking.types';
import { Check, AlertCircle, Clock, DollarSign } from 'lucide-react';

interface ReservationCardProps {
  reservation: Reservation;
}

const ReservationCard: React.FC<ReservationCardProps> = ({ reservation }) => {
  const statusStyles = {
    pending_payment: 'bg-amber-100 text-amber-700',
    pending_confirmation: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled_by_client: 'bg-slate-100 text-slate-600',
    cancelled_by_parking: 'bg-slate-100 text-slate-600',
    expired: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700'
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{reservation.parkingLotName}</h3>
          <p className="mt-2 text-sm text-slate-600">{reservation.vehicleType.toUpperCase()} — {reservation.vehiclePlate}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[reservation.status] || 'bg-slate-100 text-slate-600'}`}>
          {reservation.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
          <span className="flex items-center gap-2"><Clock size={16} /> {reservation.startTime}</span>
          <span className="mt-2 flex items-center gap-2"><Clock size={16} /> {reservation.endTime}</span>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
          <span className="flex items-center gap-2"><DollarSign size={16} /> Total</span>
          <p className="mt-2 text-xl font-semibold text-slate-900">${reservation.totalAmount}</p>
        </div>
      </div>
    </article>
  );
};

export default ReservationCard;
