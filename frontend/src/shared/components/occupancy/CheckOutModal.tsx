// src/shared/components/occupancy/CheckOutModal.tsx
import { X } from 'lucide-react';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  spaceNumber: string;
  vehiclePlate?: string;
  isLoading?: boolean;
}

export function CheckOutModal({
  isOpen,
  onClose,
  onConfirm,
  spaceNumber,
  vehiclePlate,
  isLoading = false,
}: CheckOutModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Registrar salida</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="mb-4 text-gray-600">
            ¿Confirmar salida del espacio <strong>{spaceNumber}</strong>
            {vehiclePlate && ` para el vehículo ${vehiclePlate}`}?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-500 text-white py-2 rounded-xl hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Procesando...' : 'Confirmar salida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}