import { useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useWebsocketStore } from '../../../stores/websocketStore';
import { UserRole } from '../../../types/auth.types';
import { TRACKING_REFRESH_EVENT, TRACKING_SOCKET_EVENTS } from '../trackingEvents';

/**
 * Montado en el layout del cliente. Solo sincroniza datos del seguimiento
 * (ingresos, egresos, cambios de servicios, reconexión). Los avisos al usuario
 * se migraron al centro de notificaciones (campana): acá no se muestran toasts.
 */
function ClientTrackingListener() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const connect = useWebsocketStore((s) => s.connect);
  const socket = useWebsocketStore((s) => s.socket);

  useEffect(() => {
    if (token && role === UserRole.CLIENT) connect(token);
  }, [token, role, connect]);

  useEffect(() => {
    if (!socket || role !== UserRole.CLIENT) return;
    const refresh = (event: string) => () =>
      window.dispatchEvent(new CustomEvent(TRACKING_REFRESH_EVENT, { detail: { event } }));
    const events = [...TRACKING_SOCKET_EVENTS, 'tracking:update', 'connect'];
    const handlers = events.map((e) => [e, refresh(e)] as const);
    handlers.forEach(([e, h]) => socket.on(e, h));
    return () => handlers.forEach(([e, h]) => socket.off(e, h));
  }, [socket, role]);

  return null;
}

export default ClientTrackingListener;
