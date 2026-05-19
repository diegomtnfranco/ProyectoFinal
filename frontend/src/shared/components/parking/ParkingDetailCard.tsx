import { ParkingLot } from '../../types/parking.types';
import { MapPin, Phone, Star } from 'lucide-react';

interface ParkingDetailCardProps {
  parking: ParkingLot;
}

const ParkingDetailCard: React.FC<ParkingDetailCardProps> = ({ parking }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{parking.name}</h1>
        <p className="mt-2 text-slate-600">{parking.address}</p>
      </div>
      <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span className="flex items-center gap-2"> <Star size={18} /> {parking.rating ?? '4.6'} / 5</span>
        <span className="mt-1 block">{parking.capacity} espacios</span>
      </div>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-3xl bg-slate-50 p-5">
        <h2 className="text-sm font-semibold text-slate-700">Estado</h2>
        <p className="mt-2 text-slate-600">{parking.isOpen ? 'Abierto hoy' : 'Cerrado'}</p>
      </div>
      <div className="rounded-3xl bg-slate-50 p-5">
        <h2 className="text-sm font-semibold text-slate-700">Contacto</h2>
        <p className="mt-2 flex items-center gap-2 text-slate-600"><Phone size={16} /> {parking.contactPhone ?? 'No disponible'}</p>
      </div>
    </div>
  </div>
);

export default ParkingDetailCard;
