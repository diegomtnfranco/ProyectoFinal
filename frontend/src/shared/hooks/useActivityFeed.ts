import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebsocketStore } from '../../stores/websocketStore';

/** Eventos de socket que implican que el feed de actividad cambió */
const ACTIVITY_EVENTS = [
  'occupancy:update',
  'reservation:new',
  'reservation:confirmed',
  'reservation:cancelled',
] as const;

/**
 * Hook genérico: ejecuta `fetcher`, lo vuelve a ejecutar cuando cambia `key`,
 * ante eventos de websocket relevantes y cada `refreshMs` (para que la tarifa
 * estimada se mantenga al día). Usa estado local: no modifica ningún store de
 * zustand, solo lee el socket ya conectado.
 */
export function useActivityFeed<T>(
  fetcher: () => Promise<T>,
  key: string,
  { enabled = true, refreshMs = 60_000 }: { enabled?: boolean; refreshMs?: number } = {},
) {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({
    key: null,
    data: null,
    error: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const socket = useWebsocketStore((s) => s.socket);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  // Evita que una respuesta vieja pise a una más nueva (ej. cambio rápido de filtro)
  const requestIdRef = useRef(0);

  /** Pide los datos; el estado solo se actualiza después del await */
  const run = useCallback(async (requestKey: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const result = await fetcherRef.current();
      if (requestId !== requestIdRef.current) return;
      setState({ key: requestKey, data: result, error: null });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const message = typeof err === 'string' ? err : 'No se pudo cargar la actividad';
      setState((prev) => ({ ...prev, key: requestKey, error: message }));
    }
  }, []);

  useEffect(() => {
    if (enabled) void run(key);
  }, [enabled, key, run]);

  /** Recarga manual / por socket / por intervalo */
  const reload = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      await run(key);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, key, run]);

  useEffect(() => {
    if (!enabled || !refreshMs) return;
    const id = setInterval(reload, refreshMs);
    return () => clearInterval(id);
  }, [enabled, refreshMs, reload]);

  useEffect(() => {
    if (!socket || !enabled) return;
    // Pequeño debounce: un check-in dispara varios eventos seguidos
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 300);
    };
    ACTIVITY_EVENTS.forEach((e) => socket.on(e, handler));
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => socket.off(e, handler));
    };
  }, [socket, enabled, reload]);

  const isLoading = enabled && (state.key !== key || refreshing);
  return { data: state.data, isLoading, error: state.error, reload };
}
