export const NOTIFICATION_RETENTION_DAYS = 90;
export const OCCUPANCY_COOLDOWN_MINUTES = 10;
/** Espera para leer datos ya confirmados después de un evento de TypeORM (que ocurre antes del commit) */
export const POST_COMMIT_DELAY_MS = 500;

export const NotificationType = {
  CLOSING_SOON: 'closing_soon',
  RATE_REDUCTION: 'rate_reduction',
  AVAILABILITY: 'availability',
  RESERVATION_REQUEST: 'reservation_request',
  RESERVATION_CANCELLED_BY_CLIENT: 'reservation_cancelled_by_client',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  RESERVATION_REJECTED: 'reservation_rejected',
  RESERVATION_CANCELLED_BY_PARKING: 'reservation_cancelled_by_parking',
} as const;
export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NOTIFICATION_CATEGORY: Record<NotificationTypeValue, string> = {
  closing_soon: 'Cierre',
  rate_reduction: 'Tarifas',
  availability: 'Disponibilidad',
  reservation_request: 'Reservas',
  reservation_cancelled_by_client: 'Reservas',
  reservation_confirmed: 'Reservas',
  reservation_rejected: 'Reservas',
  reservation_cancelled_by_parking: 'Reservas',
};

export const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86_400_000);
