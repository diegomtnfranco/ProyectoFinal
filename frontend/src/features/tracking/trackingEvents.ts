/** Eventos de socket del seguimiento que implican recargar datos (no son avisos al usuario) */
export const TRACKING_SOCKET_EVENTS = ['tracking:checkin', 'tracking:limit', 'tracking:checkout'] as const;

/** Evento DOM para que las vistas recarguen datos sin acoplarse al socket */
export const TRACKING_REFRESH_EVENT = 'estacionapp:tracking-refresh';
