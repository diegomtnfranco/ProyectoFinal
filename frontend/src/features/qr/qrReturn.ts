/**
 * Recuerda el QR (entrada o salida) escaneado cuando el cliente todavía tiene que
 * iniciar sesión o registrar su vehículo, para retomarlo después.
 * Solo se guardan rutas internas /scan/check-in|check-out (nunca URLs externas).
 */
const KEY = 'estacionapp:qr-checkout-return';
const isSafe = (path: string | null): path is string => !!path && /^\/scan\/check-(in|out)\?token=[A-Za-z0-9_.~%-]+$/.test(path);

export const rememberQrReturn = (path: string) => {
  try {
    if (isSafe(path)) sessionStorage.setItem(KEY, path);
  } catch {
    /* almacenamiento no disponible: el cliente vuelve a escanear */
  }
};

export const peekQrReturn = (): string | null => {
  try {
    const value = sessionStorage.getItem(KEY);
    return isSafe(value) ? value : null;
  } catch {
    return null;
  }
};

export const consumeQrReturn = (): string | null => {
  const value = peekQrReturn();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
  return value;
};
