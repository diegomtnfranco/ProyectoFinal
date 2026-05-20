import { format } from 'date-fns';

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(amount);
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), 'PPpp');
}
