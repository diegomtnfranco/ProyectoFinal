import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, CircleAlert, History, RefreshCw } from 'lucide-react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { activityService } from '../../services/activity.service';
import { useActivityFeed } from '../../shared/hooks/useActivityFeed';
import ActivityCard from '../../shared/components/activity/ActivityCard';
import { NoParkingMessage } from '../../shared/components/common/NoParkingMessage';
import type { ActivityTypeValue } from '../../types/activity.types';

const PAGE_SIZE = 12;

const FILTERS: { value: ActivityTypeValue | undefined; label: string }[] = [
  { value: undefined, label: 'Todas' },
  { value: 'check_in', label: 'En el lugar' },
  { value: 'check_out', label: 'Egresos' },
  { value: 'reservation', label: 'Reservas' },
  { value: 'rate_change', label: 'Tarifas' },
];

/** Página completa de actividad del estacionamiento (owner y employee). */
function ActivityPage() {
  const { currentParkingLot, fetchMyParkingLot, isLoading: parkingLoading } = useParkingLotsStore();
  const [page, setPage] = useState(1);
  const [type, setType] = useState<ActivityTypeValue | undefined>(undefined);
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/employee') ? '/employee' : '/owner';
  const parkingLotId = currentParkingLot?.id ?? '';

  useEffect(() => {
    if (!currentParkingLot) fetchMyParkingLot();
  }, [currentParkingLot, fetchMyParkingLot]);

  const { data, isLoading, error, reload } = useActivityFeed(
    () => activityService.getPaginated(parkingLotId, { page, limit: PAGE_SIZE, type }),
    `${parkingLotId}:${page}:${type ?? "all"}`,
    { enabled: !!parkingLotId },
  );

  const changeFilter = (value: ActivityTypeValue | undefined) => {
    setType(value);
    setPage(1);
  };

  if (!currentParkingLot && !parkingLoading) {
    return (
      <NoParkingMessage
        variant="info"
        title="Error al cargar el estacionamiento"
        message="No tienes ningún estacionamiento asignado"
      />
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to={`${basePath}/parking`} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={14} /> Volver al panel
          </Link>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Actividad</h1>
          <p className="text-sm text-gray-500">
            Ingresos, egresos y reservas de {currentParkingLot?.name ?? 'tu estacionamiento'}
          </p>
        </div>
        <button
          onClick={reload}
          className="inline-flex items-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => changeFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              type === f.value ? 'bg-blue-500 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        {data && <span className="ml-auto self-center text-sm text-slate-500">{data.total} registros</span>}
      </div>

      {error && !data && (
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <CircleAlert size={32} className="mx-auto mb-2 opacity-60" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && !data &&
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-100" />)}
        {data?.items.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>

      {data && data.items.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          <History size={44} className="mx-auto mb-2 opacity-50" />
          <p>No hay actividad para este filtro</p>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-sm text-slate-600">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.hasMore}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ActivityPage;