import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reservationSchema } from '../../utils/validators';
import { z } from 'zod';
import { calculatePrice, getRateForVehicle } from '../../utils/priceCalculator';
import { Rate } from '../../types/parking.types';

const formSchema = reservationSchema;
export type ReservationFormValues = z.infer<typeof formSchema>;

interface ReservationFormProps {
  rates: Rate[];
  onSubmit: (values: ReservationFormValues) => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ rates, onSubmit }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ReservationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleType: 'car',
      plateNumber: '',
      startDate: '',
      endDate: ''
    }
  });

  const vehicleType = watch('vehicleType');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const price = useMemo(() => {
    const rate = getRateForVehicle(rates, vehicleType);
    if (!rate || !startDate || !endDate) return 0;
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600);
    return calculatePrice(rate, Math.max(1, Math.ceil(diff)));
  }, [rates, vehicleType, startDate, endDate]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Vehículo
          <select {...register('vehicleType')} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
            <option value="car">Auto</option>
            <option value="truck">Camión</option>
            <option value="bike">Moto</option>
          </select>
          {errors.vehicleType && <p className="text-xs text-red-600">{errors.vehicleType.message}</p>}
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Patente
          <div className="relative">
            <input type="text" {...register('plateNumber')} placeholder="ABC123" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          </div>
          {errors.plateNumber && <p className="text-xs text-red-600">{errors.plateNumber.message}</p>}
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Fecha y hora inicio
          <input type="datetime-local" {...register('startDate')} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          {errors.startDate && <p className="text-xs text-red-600">{errors.startDate.message}</p>}
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Fecha y hora fin
          <input type="datetime-local" {...register('endDate')} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
        </label>
      </div>
      <div className="rounded-3xl bg-slate-50 p-5 text-slate-700">
        <p className="text-sm">Precio estimado</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">${price}</p>
      </div>
      <button type="submit" className="w-full rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700">
        Confirmar reserva
      </button>
    </form>
  );
};

export default ReservationForm;
