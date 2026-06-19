import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const EmployeeList: React.FC = () => {
  const [employees] = useState([
    { id: 'e1', name: 'Camila', email: 'camila@example.com', role: 'Supervisor' },
    { id: 'e2', name: 'Pablo', email: 'pablo@example.com', role: 'Atención' }
  ]);

  useEffect(() => {
    // TODO: Cargar empleados desde la API
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Empleados</h1>
          <p className="mt-2 text-sm text-slate-500">Gestiona el equipo de atención y soporte del estacionamiento.</p>
        </div>
        <Link to="/owner/employees/new" className="rounded-3xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700">
          Nuevo empleado
        </Link>
      </div>
      <div className="grid gap-4">
        {employees.map((employee) => (
          <div key={employee.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">{employee.name}</p>
                <p className="mt-1 text-sm text-slate-600">{employee.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{employee.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeList;
