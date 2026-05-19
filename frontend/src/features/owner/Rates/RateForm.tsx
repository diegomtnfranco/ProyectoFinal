import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import rateService from '../../../services/rate.service';
import LoadingSpinner from '../../../shared/components/common/LoadingSpinner';

const RateForm: React.FC = () => {
  const navigate = useNavigate();
  const { parkingLotId } = useParams();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (parkingLotId) {
        await rateService.createRate(parkingLotId, values);
        toast.success('Tarifa guardada');
        navigate(`/owner/rates/${parkingLotId}`);
      }
    } catch {
      toast.error('No se pudo guardar la tarifa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Tarifas del estacionamiento</h1>
        <p className="mt-2 text-sm text-slate-500">Define precios por tipo de vehículo </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols">
        {/* <label className="block text-sm font-medium text-slate-700">
          Nombre de tarifa
          <input {...register('label')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label> */}
        <label className="block text-sm font-medium text-slate-700">
          Tipo de vehículo
          <select {...register('vehicleType')} className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
            <option value="car">Auto</option>
            <option value="truck">Camioneta</option>
            <option value="motorcycle">Moto</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Precio por hora
          <input type="number" {...register('pricePerHour')} className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        {/* <label className="block text-sm font-medium text-slate-700">
          Hora inicio
          <input type="time" {...register('startTime')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Hora fin
          <input type="time" {...register('endTime')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label> */}
        <button type="submit" disabled={loading} className=" rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          {loading ? <LoadingSpinner /> : 'Crear tarifa'}
        </button>
      </form>
    </div>
  );
};

export default RateForm;
