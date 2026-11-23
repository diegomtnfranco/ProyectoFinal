import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, History, LoaderCircle, ParkingSquare, RefreshCw } from 'lucide-react';
import { clientTrackingService } from '../../../services/client-tracking.service';
import type { MyTracking } from '../../../types/client-tracking.types';
import { TRACKING_REFRESH_EVENT } from '../trackingEvents';
import TrackingCard from './TrackingCard';

const OPEN_KEY = 'estacionapp.tracking.open';
const readOpen = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

/**
 * Vehículos estacionados del cliente (sobre "Mis Reservas"). Los datos vienen
 * siempre del backend: al cargar, cada 5 minutos y ante eventos del socket.
 */
function ParkedVehiclesSection() {
  const [data, setData] = useState<MyTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showFinished, setShowFinished] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await clientTrackingService.getMine());
      setError(null);
      setNow(Date.now());
    } catch (err) {
      setError(typeof err === 'string' ? err : 'No se pudo cargar el seguimiento');
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    clientTrackingService
      .getMine()
      .then((tracking) => {
        if (!cancelled) setData(tracking);
      })
      .catch((err) => !cancelled && setError(typeof err === 'string' ? err : 'No se pudo cargar el seguimiento'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Tarifa aproximada: cada 5 minutos desde el backend (no depende de eventos)
  const refreshSeconds = data?.refreshSeconds ?? 300;
  useEffect(() => {
    const id = setInterval(load, refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [load, refreshSeconds]);

  // Reloj de la vista para el tiempo transcurrido (el importe no se recalcula acá)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Eventos de ingreso/egreso/alertas/servicios o reconexión: volver a pedir al backend
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 400);
    };
    window.addEventListener(TRACKING_REFRESH_EVENT, handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(TRACKING_REFRESH_EVENT, handler);
    };
  }, [load]);

  const openIds = readOpen();
  const setOpen = (linkId: string, open: boolean) => {
    try {
      const set = new Set(readOpen());
      if (open) set.add(linkId);
      else set.delete(linkId);
      sessionStorage.setItem(OPEN_KEY, JSON.stringify([...set]));
    } catch {
      // sin almacenamiento: el estado queda solo en la tarjeta
    }
  };

  const liveElapsed = (checkInTime: string) => Math.max(0, Math.floor((now - new Date(checkInTime).getTime()) / 60_000));

  return (
    <section className="mb-8" aria-labelledby="parked-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="parked-title" className="flex items-center gap-2 text-xl font-bold">
            <ParkingSquare size={22} className="text-green-600" /> Vehículos estacionados
          </h2>
          <p className="text-sm text-gray-500">Seguimiento de tus vehículos registrados mientras están en un estacionamiento. Los avisos llegan a la campana de notificaciones.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            aria-label="Actualizar seguimiento"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {error && !data && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <CircleAlert size={16} /> {error}
        </p>
      )}
      {!data && !error && (
        <p className="flex items-center gap-2 text-gray-500">
          <LoaderCircle size={16} className="animate-spin" /> Cargando seguimiento…
        </p>
      )}

      {data && (
        <div className="space-y-3">
          {data.active.length === 0 && (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
              No tenés vehículos ingresados en este momento. Registrá tus patentes en Perfil &gt; Mi vehículo para seguirlos acá.
            </p>
          )}
          {data.active.map((t) => (
            <TrackingCard
              key={t.linkId}
              tracking={t}
              liveElapsedMinutes={liveElapsed(t.checkInTime)}
              defaultOpen={openIds.includes(t.linkId)}
              onToggle={(open) => setOpen(t.linkId, open)}
            />
          ))}

          {data.limitNotices.map((n) => (
            <p key={n.occupancyId} className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              Tu vehículo {n.plate} ingresó a {n.parkingLotName}, pero ya tenés {data.maxActive} vehículos en seguimiento: este ingreso no se
              agregó. El ingreso no se vio afectado.
            </p>
          ))}

          <div className="flex flex-wrap gap-3 text-sm">
            {data.finished.length > 0 && (
              <button onClick={() => setShowFinished((v) => !v)} className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600">
                <History size={14} /> {showFinished ? 'Ocultar' : 'Ver'} ingresos finalizados ({data.finished.length})
              </button>
            )}
          </div>

          {showFinished && data.finished.map((t) => <TrackingCard key={t.linkId} tracking={t} liveElapsedMinutes={t.elapsedMinutes} />)}

        </div>
      )}
    </section>
  );
}

export default ParkedVehiclesSection;
