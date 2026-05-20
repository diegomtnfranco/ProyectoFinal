import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import parkingService from '../../../services/parking.service';

const SpaceForm: React.FC = () => {
  const navigate = useNavigate();
  const { parkingLotId } = useParams();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (parkingLotId) {
        await parkingService.createSpace(parkingLotId, values);
        toast.success('Espacio creado');
        navigate(`/owner/spaces/${parkingLotId}`);
      }
    } catch {
      toast.error('No se pudo crear el espacio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Agregar espacio</h1>
        <p className="mt-2 text-sm text-slate-500">Define el tipo de espacio y precio por hora.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Número
          <input {...register('number')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Tipo
          <select {...register('type')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
            <option value="car">Auto</option>
            <option value="truck">Camión</option>
            <option value="bike">Moto</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Precio por hora
          <input type="number" {...register('pricePerHour')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Nivel
          <input {...register('level')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <button type="submit" disabled={loading} className="sm:col-span-2 rounded-3xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Guardando...' : 'Crear espacio'}
        </button>
      </form>
    </div>
  );
};

export default SpaceForm;
