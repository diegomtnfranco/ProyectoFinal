import { useState } from 'react';

const ReservationsOwner: React.FC = () => {
  const [reservations] = useState([
    { id: 'o1', client: 'Santiago', status: 'Confirmada', hours: '08:00 - 10:00' },
    { id: 'o2', client: 'Ana', status: 'Pendiente', hours: '10:30 - 12:30' }
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Reservas del dueño</h1>
        <p className="mt-2 text-sm text-slate-500">Supervisa reservas generadas por los clientes.</p>
      </div>
      <div className="grid gap-4">
        {reservations.map((reservation) => (
          <div key={reservation.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900">Reserva {reservation.id}</p>
              <p className="mt-1 text-sm text-slate-600">Cliente: {reservation.client}</p>
              <p className="mt-1 text-sm text-slate-600">Horario: {reservation.hours}</p>
            </div>
            <span className="mt-4 rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700 sm:mt-0">{reservation.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReservationsOwner;
