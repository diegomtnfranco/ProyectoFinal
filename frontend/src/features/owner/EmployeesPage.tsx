import { useEffect, useState, useRef } from 'react';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { EmployeeList } from './Employees/EmployeeList';
import EmployeeFormModal from './Employees/components/EmployeeFormModal';
import { Users, UserPlus, Loader2} from 'lucide-react';
import { NoParkingMessage } from '../../shared/components/common/NoParkingMessage';

function EmployeesPage() {
  const { 
    currentParkingLot, 
    fetchMyParkingLot, 
    isLoading: parkingLoading, 
    error: parkingError,
    hasFetchedOnce,
    clearError,
  } = useParkingLotsStore();
  const { employees, isLoading: isLoadingEmployees, fetchEmployees } = useEmployeeStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fetchAttempted = useRef(false);

  // ✅ Solo cargar si no se ha intentado antes y no hay parking
  useEffect(() => {
    if (fetchAttempted.current) return;
    if (currentParkingLot) return;
    if (hasFetchedOnce) return;
    
    if (!parkingLoading) {
      fetchAttempted.current = true;
      fetchMyParkingLot();
    }
  }, [parkingLoading, currentParkingLot, hasFetchedOnce, fetchMyParkingLot]);

  // ✅ Cargar empleados solo si hay parking
  useEffect(() => {
    if (currentParkingLot?.id) {
      fetchEmployees(currentParkingLot.id);
    }
  }, [currentParkingLot, fetchEmployees]);

  // ✅ 1️⃣ Error al cargar el estacionamiento
  if (parkingError && hasFetchedOnce && !currentParkingLot) {
    return (
      <NoParkingMessage
        variant="info"
        title="Error al cargar el estacionamiento"
        message={parkingError}
        buttonText="Reintentar"
        buttonAction={() => {
          clearError();
          fetchAttempted.current = false;
          useParkingLotsStore.setState({ hasFetchedOnce: false });
          fetchMyParkingLot();
        }}
      />
    );
  }

  // ✅ 2️⃣ Cargando inicial
  if ((parkingLoading || isLoadingEmployees) && !currentParkingLot && !hasFetchedOnce) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  // ✅ 3️⃣ No hay estacionamiento registrado
  if (!currentParkingLot && hasFetchedOnce) {
    return (
      <NoParkingMessage
        variant="warning"
        title="No hay estacionamiento registrado"
        message="Para gestionar empleados, primero debes tener un estacionamiento registrado y activo."
        buttonText="Registrar estacionamiento"
      />
    );
  }

  // ✅ 4️⃣ Cargando empleados (cuando ya hay parking pero los empleados se están cargando)
  if (isLoadingEmployees && employees.length === 0 && currentParkingLot) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  // ✅ Renderizado principal
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