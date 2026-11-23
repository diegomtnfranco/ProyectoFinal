import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, LoaderCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useWebsocketStore } from '../../../stores/websocketStore';
import { userNotificationsService } from '../../../services/user-notifications.service';
import type { UserNotification } from '../../../types/user-notifications.types';

const PAGE_SIZE = 15;
const dateTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const CATEGORY_STYLE: Record<string, string> = {
  Reservas: 'bg-violet-100 text-violet-700',
  Tarifas: 'bg-green-100 text-green-700',
  Disponibilidad: 'bg-blue-100 text-blue-700',
  Cierre: 'bg-amber-100 text-amber-800',
};

const badgeText = (n: number) => (n > 99 ? '99+' : String(n));

/**
 * Campana del centro de notificaciones (todos los roles autenticados).
 * El contador y el listado vienen siempre del backend; el socket solo avisa
 * novedades y, al reconectar, se vuelve a pedir todo por HTTP.
 */
function NotificationBell() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const connect = useWebsocketStore((s) => s.connect);
  const socket = useWebsocketStore((s) => s.socket);

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const syncCount = useCallback(async () => {
    try {
      setUnread(await userNotificationsService.unreadCount());
    } catch {
      // sin conexión: se reintenta en la próxima sincronización
    }
  }, []);

  const loadPage = useCallback(async (target: number) => {
    setLoading(true);
    try {
      const res = await userNotificationsService.list(target, PAGE_SIZE);
      setItems((prev) => (target === 1 ? res.items : [...prev, ...res.items.filter((n) => !prev.some((p) => p.id === n.id))]));
      setPage(target);
      setHasMore(res.hasMore);
      setUnread(res.unreadCount);
      setError(null);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  // Conexión existente (no abre otra) y contador inicial
  useEffect(() => {
    if (!token) return;
    connect(token);
    void userNotificationsService
      .unreadCount()
      .then(setUnread)
      .catch(() => undefined);
  }, [token, connect]);

  // Eventos propios del centro de notificaciones (separados de los de negocio)
  useEffect(() => {
    if (!socket) return;
    const onNew = (payload: { notification?: UserNotification; unreadCount?: number } = {}) => {
      if (typeof payload.unreadCount === 'number') setUnread(payload.unreadCount);
      const n = payload.notification;
      if (n) setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
    };
    const onCount = (payload: { unreadCount?: number; readId?: string } = {}) => {
      if (typeof payload.unreadCount === 'number') setUnread(payload.unreadCount);
      if (payload.readId) {
        setItems((prev) => prev.map((p) => (p.id === payload.readId && !p.readAt ? { ...p, readAt: new Date().toISOString() } : p)));
      }
    };
    const onReconnect = () => {
      void syncCount();
      if (open) void loadPage(1);
    };
    socket.on('notification:new', onNew);
    socket.on('notification:count', onCount);
    socket.on('connect', onReconnect);
    return () => {
      socket.off('notification:new', onNew);
      socket.off('notification:count', onCount);
      socket.off('connect', onReconnect);
    };
  }, [socket, open, syncCount, loadPage]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void loadPage(1);
  };

  const markRead = async (n: UserNotification) => {
    if (n.readAt || marking) return;
    setMarking(n.id);
    try {
      const res = await userNotificationsService.markRead(n.id);
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, readAt: res.readAt } : p)));
      setUnread(res.unreadCount);
    } catch {
      // se mantiene como no leída
    } finally {
      setMarking(null);
    }
  };

  /** Navegación informativa: solo cambia de pantalla, nunca ejecuta acciones */
  const openLink = async (n: UserNotification) => {
    await markRead(n);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15"
      >
        <Bell size={22} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-blue-500">
            {badgeText(unread)}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 z-[1100] max-h-[75vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold text-gray-800">Notificaciones</h2>
            {unread > 0 && <span className="text-xs text-gray-500">{badgeText(unread)} sin leer</span>}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {error && items.length === 0 && <p className="p-4 text-sm text-red-600">{error}</p>}
            {!error && !loading && items.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-500">No tenés notificaciones.</p>
            )}
            <ul className="divide-y divide-gray-100">
              {items.map((n) => (
                <li key={n.id} className={n.readAt ? 'bg-white' : 'bg-blue-50/60'}>
                  <div className="flex gap-3 px-4 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-blue-500'}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => openLink(n)} className="block w-full text-left">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm ${n.readAt ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_STYLE[n.category] ?? 'bg-gray-100 text-gray-600'}`}>
                            {n.category}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-sm text-gray-600">{n.message}</span>
                        <span className="mt-1 block text-xs text-gray-400">{dateTime.format(new Date(n.createdAt))}</span>
                      </button>
                      {!n.readAt && (
                        <button
                          type="button"
                          onClick={() => markRead(n)}
                          disabled={marking === n.id}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {marking === n.id ? <LoaderCircle size={12} className="animate-spin" /> : <Check size={12} />} Marcar como leída
                        </button>
                      )}
                      {n.readAt && <span className="mt-1 block text-xs text-gray-400">Leída</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {loading && (
              <p className="flex items-center justify-center gap-2 p-3 text-sm text-gray-500">
                <LoaderCircle size={14} className="animate-spin" /> Cargando…
              </p>
            )}
            {hasMore && !loading && (
              <button type="button" onClick={() => loadPage(page + 1)} className="w-full p-3 text-sm font-medium text-blue-600 hover:bg-gray-50">
                Ver más
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
