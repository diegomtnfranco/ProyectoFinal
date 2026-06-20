import { useEffect, useState } from 'react';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { EmployeeList } from './Employees/EmployeeList';
import  EmployeeFormModal  from './Employees/components/EmployeeFormModal';
import { Users, UserPlus, Loader2, XCircle } from 'lucide-react';

function EmployeesPage() {
  const { currentParkingLot, fetchMyParkingLot, isLoading: parkingLoading, error: parkingError } = useParkingLotsStore();
  const { employees, isLoading, fetchEmployees } = useEmployeeStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!currentParkingLot && !parkingLoading) {
      fetchMyParkingLot();
    }
  }, [currentParkingLot, parkingLoading, fetchMyParkingLot]);

  useEffect(() => {
    if (currentParkingLot?.id) {
      fetchEmployees(currentParkingLot.id);
    }
  }, [currentParkingLot, fetchEmployees]);

  if (parkingError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="bg-red-50 rounded-xl p-6 max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{parkingError}</p>
          <button onClick={() => fetchMyParkingLot()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if ((parkingLoading || isLoading) && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (!currentParkingLot && !parkingLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="bg-yellow-50 rounded-xl p-6 max-w-md">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">No hay estacionamiento registrado</h2>
          <p className="text-yellow-600 mb-4">Para gestionar empleados, primero debes tener un estacionamiento registrado.</p>
          <button onClick={() => window.location.href = '/create-company'} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl">
            Registrar estacionamiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Users size={24} />
            Empleados
          </h1>
          <p className="mt-2 text-sm text-slate-500">Gestiona el equipo de atención y soporte del estacionamiento.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-3xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 flex items-center gap-2"
        >
          <UserPlus size={18} />
          Nuevo empleado
        </button>
      </div>

      <EmployeeList />

      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        parkingLotId={currentParkingLot?.id}
        onSuccess={() => {
          setIsModalOpen(false);
          if (currentParkingLot?.id) {
            fetchEmployees(currentParkingLot.id);
          }
        }}
      />
    </div>
  );
}

export default EmployeesPage;