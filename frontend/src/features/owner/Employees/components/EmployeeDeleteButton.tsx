import { useState } from 'react';
import { Trash2, Loader2, RotateCw } from 'lucide-react';
import { useEmployeeStore } from '../../../../stores/employeeStore';
import { useToast } from '../../../../shared/hooks/useToast';
import { ConfirmModal } from '../../../../shared/components/common/ConfirmModal';

interface Props {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
  onSuccess?: () => void;
}

export function EmployeeDeleteButton({ employeeId, employeeName, isActive, onSuccess }: Props) {
  const { deleteEmployee, updateEmployee } = useEmployeeStore();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);
    try {
      if (isActive) {
        // Desactivar empleado
        await deleteEmployee(employeeId);
        showSuccess('Empleado desactivado exitosamente');
      } else {
        // Reactivar empleado
        await updateEmployee(employeeId, { isActive: true });
        showSuccess('Empleado reactivado exitosamente');
      }
      onSuccess?.();
    } catch (error) {
      showError(isActive ? 'Error al desactivar el empleado' : 'Error al reactivar el empleado');
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  const getConfirmMessage = () => {
    if (isActive) {
      return `¿Estás seguro de que querés desactivar a ${employeeName}? El empleado no podrá acceder al sistema.`;
    }
    return `¿Estás seguro de que querés reactivar a ${employeeName}? El empleado volverá a tener acceso al sistema.`;
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
          isActive
            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
        }`}
        title={isActive ? 'Desactivar empleado' : 'Reactivar empleado'}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isActive ? (
          <Trash2 size={18} />
        ) : (
          <RotateCw size={18} />
        )}
      </button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={isActive ? 'Desactivar empleado' : 'Reactivar empleado'}
        message={getConfirmMessage()}
        confirmText={isActive ? 'Desactivar' : 'Reactivar'}
        cancelText="Cancelar"
        onConfirm={handleAction}
        onCancel={() => setIsConfirmOpen(false)}
        variant={isActive ? 'danger' : 'warning'}
      />
    </>
  );
}