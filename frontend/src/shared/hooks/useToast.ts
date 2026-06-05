// frontend/src/shared/hooks/useToast.ts
import { toast } from 'sonner';

export const useToast = () => {
  const showSuccess = (message: string) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
    });
  };

  const showError = (message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    });
  };

  const showInfo = (message: string) => {
    toast.info(message, {
      duration: 3000,
      position: 'top-right',
    });
  };

  const showWarning = (message: string) => {
    toast.warning(message, {
      duration: 4000,
      position: 'top-right',
    });
  };

  return { showSuccess, showError, showInfo, showWarning };
};