import { useState } from 'react';
import { useEmployeeStore } from '../../../stores/employeeStore';
import { EmployeeDeleteButton } from './components/EmployeeDeleteButton';
import { Users, Filter, UsersRound } from 'lucide-react';
import { useParkingLotsStore } from '../../../stores/parkingStore';

type FilterType = 'all' | 'active' | 'inactive';

export function EmployeeList() {
  const { employees, isLoading } = useEmployeeStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredEmployees = employees.filter(emp => {
    if (filter === 'active') return emp.isActive;
    if (filter === 'inactive') return !emp.isActive;
    return true;
  });

  const activeCount = employees.filter(e => e.isActive).length;
  const inactiveCount = employees.filter(e => !e.isActive).length;

  if (isLoading && employees.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users size={16} />
            Todos ({employees.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UsersRound size={16} />
            Activos ({activeCount})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === 'inactive'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter size={16} />
            Inactivos ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Lista de empleados */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p>
            {filter === 'all'
              ? 'No hay empleados registrados'
              : filter === 'active'
              ? 'No hay empleados activos'
              : 'No hay empleados inactivos'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className={`rounded-3xl border p-6 shadow-sm transition-all ${
                employee.isActive
                  ? 'border-slate-200 bg-white'
                  : 'border-red-100 bg-red-50/30'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-lg font-semibold text-slate-900">{employee.name}</p>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        employee.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          employee.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {employee.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {employee.user?.email || employee.email || 'Email no disponible'}
                  </p>
                  {employee.position && (
                    <p className="mt-1 text-xs text-slate-400">Puesto: {employee.position}</p>
                  )}
                  {employee.employeeCode && (
                    <p className="mt-1 text-xs text-slate-400 font-mono">
                      Código: {employee.employeeCode}
                    </p>
                  )}
                </div>
                <EmployeeDeleteButton
                  employeeId={employee.id}
                  employeeName={employee.name}
                  isActive={employee.isActive}
                  onSuccess={() => {
                    const { currentParkingLot } = useParkingLotsStore.getState();
                    if (currentParkingLot?.id) {
                      useEmployeeStore.getState().fetchEmployees(currentParkingLot.id);
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}