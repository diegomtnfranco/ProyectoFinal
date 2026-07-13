import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';

const EmployeeForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await fetch('/api/employees', { method: 'POST', body: JSON.stringify(values) });
      toast.success('Empleado creado');
      navigate('/owner/employees');
    } catch {
      toast.error('Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Agregar empleado</h1>
        <p className="mt-2 text-sm text-slate-500">Crea una cuenta de empleado y asigna funciones.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Nombre
          <input {...register('name')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Correo electrónico
          <input type="email" {...register('email')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Rol
          <select {...register('role')} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
            <option value="parking_employee">Empleado de parking</option>
            <option value="parking_owner">Dueño</option>
          </select>
        </label>
        <button type="submit" disabled={loading} className="sm:col-span-2 rounded-3xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Creando...' : 'Crear empleado'}
        </button>
      </form>
    </div>
  );
};

export default EmployeeForm;
