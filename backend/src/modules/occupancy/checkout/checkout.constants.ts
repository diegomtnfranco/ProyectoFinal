/**
 * Solicitud de egreso del cliente (por ahora solo pago en efectivo).
 * Es el estado del EGRESO pendiente de confirmación; el estado del PAGO vive en
 * `payments` y el de la estadía en `occupancies.is_completed`.
 */
export const CheckoutRequestStatus = {
  /** El cliente pidió salir pagando en efectivo; el personal todavía no registró el egreso */
  PENDING: 'PENDING',
  /** El personal confirmó el cobro y registró el egreso (hay un pago PRESENTIAL aprobado) */
  COMPLETED_PAID: 'COMPLETED_PAID',
  /** El personal registró el egreso sin marcar el cobro: la estadía queda con pago pendiente */
  COMPLETED_UNPAID: 'COMPLETED_UNPAID',
  /** El vehículo salió y el cliente lo pagó con su billetera */
  COMPLETED_WALLET: 'COMPLETED_WALLET',
  /** El cliente canceló la solicitud */
  CANCELLED: 'CANCELLED',
} as const;
export type CheckoutRequestStatusValue =
  (typeof CheckoutRequestStatus)[keyof typeof CheckoutRequestStatus];

export const CheckoutRequestMethod = { CASH: 'CASH' } as const;
export type CheckoutRequestMethodValue =
  (typeof CheckoutRequestMethod)[keyof typeof CheckoutRequestMethod];

/** Códigos estables para que el frontend sepa qué mostrar */
export const CheckoutErrorCode = {
  VEHICLE_REQUIRED: 'VEHICLE_REQUIRED',
  NO_MATCH: 'CHECKOUT_NO_MATCH',
  ALREADY_CHECKED_OUT: 'ALREADY_CHECKED_OUT',
  AMOUNT_CHANGED: 'AMOUNT_CHANGED',
  CASH_REQUEST_EXISTS: 'CASH_REQUEST_EXISTS',
  CASH_REQUEST_PENDING: 'CASH_REQUEST_PENDING',
  QR_LOGIN_REQUIRED: 'QR_LOGIN_REQUIRED',
  VEHICLE_NOT_OWNED: 'VEHICLE_NOT_OWNED',
  VEHICLE_ALREADY_PARKED: 'VEHICLE_ALREADY_PARKED',
  /** Un cliente con sesión no puede ingresar con una patente escrita a mano */
  QR_USE_REGISTERED_VEHICLE: 'QR_USE_REGISTERED_VEHICLE',
} as const;

/** Eventos WebSocket de esta feature */
export const CheckoutEvents = {
  /** A dueño y empleados del estacionamiento: un cliente pidió salir pagando en efectivo */
  CASH_REQUESTED: 'checkout:cash-requested',
  /** A dueño y empleados: una solicitud dejó de estar pendiente (cancelada o resuelta) */
  REQUEST_UPDATED: 'checkout:request-updated',
  /** Al cliente de la solicitud: cambió el estado de su egreso */
  STATUS: 'checkout:status',
} as const;
