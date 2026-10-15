import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, CircleAlert, History, RefreshCw } from 'lucide-react';
import { activityService } from '../../../services/activity.service';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import ActivityCard from './ActivityCard';

const COLLAPSED_LIMIT = 3;
const EXPANDED_LIMIT = 10;

interface RecentActivityPanelProps {
  parkingLotId: string;
  className?: string;
  /** Oculta el título cuando el panel ya está dentro de una pestaña */
  hideTitle?: boolean;
}

function RecentActivityPanel({ parkingLotId, className = '', hideTitle = false }: RecentActivityPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = expanded ? EXPANDED_LIMIT : COLLAPSED_LIMIT;
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/employee') ? '/employee' : '/owner';

  const { data, isLoading, error, reload } = useActivityFeed(
    () => activityService.getRecent(parkingLotId, limit),
    `${parkingLotId}:${limit}`,
    { enabled: !!parkingLotId },
  );
  const items = data ?? [];

  return (
    <section className={`rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px] flex flex-col ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        {!hideTitle ? (
          <h2 className="text-lg font-semibold text-slate-800">Últimas actividades</h2>
        ) : (
          <p className="text-sm text-slate-500">Ingresos, egresos y reservas</p>
        )}
        <button
          onClick={reload}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          title="Actualizar"
          aria-label="Actualizar actividades"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className={`flex-1 space-y-3 ${expanded ? 'overflow-y-auto max-h-[500px] pr-1' : ''}`}>
        {isLoading && !data &&
          Array.from({ length: COLLAPSED_LIMIT }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100" />
          ))}

        {error && !data && (
          <div className="py-8 text-center text-sm text-red-600">
            <CircleAlert size={32} className="mx-auto mb-2 opacity-60" />
            <p>{error}</p>
            <button onClick={reload} className="mt-2 text-blue-600 hover:underline">Reintentar</button>
          </div>
        )}

        {data && items.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <History size={40} className="mx-auto mb-2 opacity-50" />
            <p>Todavía no hay actividad registrada</p>
          </div>
        )}

        {items.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            disabled={!expanded && items.length < COLLAPSED_LIMIT}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Ver menos' : 'Expandir'}
          </button>
          <Link
            to={`${basePath}/activity`}
            className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            Ver todo <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}

export default RecentActivityPanel;
