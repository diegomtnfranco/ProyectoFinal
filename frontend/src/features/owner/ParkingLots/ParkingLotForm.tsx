import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useParkingStore from '../../../stores/parkingStore';
import parkingService from '../../../services/parking.service';
import type { ParkingLot } from '../../../types/parking.types';

const ParkingLotForm: React.FC = () => {
  const navigate = useNavigate();
  const { loadParkingLots } = useParkingStore();
  const { register, handleSubmit } = useForm<Partial<ParkingLot>>();

  const onSubmit = async (values: Partial<ParkingLot>) => {
    try {
      await parkingService.createParkingLot(values);
      toast.success('Estacionamiento creado');
      loadParkingLots();
      navigate('/owner/parking-lots');
    } catch {
      toast.error('No se pudo crear el estacionamiento');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo estacionamiento</h1>
        <p className="mt-2 text-sm text-slate-500">Registra un nuevo lote y comienza a recibir reservas.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Nombre
          <input {...register('name')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Dirección
          <input {...register('address')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Latitud
          <input type="number" step="0.0001" {...register('latitude')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Longitud
          <input type="number" step="0.0001" {...register('longitude')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Capacidad
          <input type="number" {...register('capacity')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <button type="submit" className="sm:col-span-2 rounded-3xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700">
          Guardar estacionamiento
        </button>
      </form>
    </div>
  );
};

export default ParkingLotForm;
