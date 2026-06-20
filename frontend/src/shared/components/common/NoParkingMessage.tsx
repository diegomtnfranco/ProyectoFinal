// frontend/src/shared/components/common/NoParkingMessage.tsx
import { Building2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NoParkingMessageProps {
  title?: string;
  message?: string;
  buttonText?: string;
  buttonAction?: () => void;
  variant?: 'info' | 'warning' | 'error';
}

export function NoParkingMessage({
  title = 'No hay estacionamiento registrado',
  message = 'Para gestionar este recurso, primero debes tener un estacionamiento registrado y activo.',
  buttonText = 'Registrar estacionamiento',
  buttonAction,
  variant = 'warning',
}: NoParkingMessageProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (buttonAction) {
      buttonAction();
    } else {
      navigate('/create-company');
    }
  };

  const variantStyles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      title: 'text-blue-800',
      text: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      title: 'text-yellow-800',
      text: 'text-yellow-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: 'text-red-800',
      text: 'text-red-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`flex flex-col items-center justify-center h-96 text-center p-4`}>
      <div className={`${styles.bg} rounded-xl p-6 max-w-md border ${styles.border}`}>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Building2 size={32} className="text-gray-400" />
          </div>
        </div>
        <h2 className={`text-xl font-semibold ${styles.title} mb-2`}>
          {title}
        </h2>
        <p className={`${styles.text} mb-4`}>
          {message}
        </p>
        <button
          onClick={handleAction}
          className={`${styles.button} text-white px-6 py-2.5 rounded-xl font-medium transition-colors`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}