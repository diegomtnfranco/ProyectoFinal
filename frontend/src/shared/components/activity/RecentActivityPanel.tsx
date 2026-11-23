import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CircleAlert, History, RefreshCw } from 'lucide-react';
import { activityService } from '../../../services/activity.service';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import ActivityCard from './ActivityCard';
import { sortByRecent } from './activity.utils';

/** El dashboard muestra siempre las 4 actividades más recientes, colapsadas */
const DASHBOARD_LIMIT = 4;

interface RecentActivityPanelProps {
  parkingLotId: string;
  className?: string;
  /** Oculta el título cuando el panel ya está dentro de una pestaña */
  hideTitle?: boolean;
}

function RecentActivityPanel({ parkingLotId, className = '', hideTitle = false }: RecentActivityPanelProps) {
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/employee') ? '/employee' : '/owner';

  const { data, isLoading, error, reload } = useActivityFeed(
    () => activityService.getRecent(parkingLotId, DASHBOARD_LIMIT),
    `${parkingLotId}:${DASHBOARD_LIMIT}`,
    { enabled: !!parkingLotId },
  );
  // De la más reciente a la menos reciente, máximo 4
  const items = sortByRecent(data ?? []).slice(0, DASHBOARD_LIMIT);

  return (
    <section
      className={`flex min-h-[350px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-['Inter',ui-sans-serif,system-ui,sans-serif] ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        {!hideTitle ? (
          <h2 className="text-lg font-semibold text-[#1C1917]">Últimas actividades</h2>
        ) : (
          <p className="text-sm text-[#6B6560]">Ingresos, egresos, reservas y tarifas</p>
        )}
        <button
          type="button"
          onClick={reload}
          className="rounded-lg p-1.5 text-[#A8A29E] transition-[background-color,color,transform] duration-150 ease-out hover:bg-[#F5F5F4] hover:text-[#57534E] active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          title="Actualizar"
          aria-label="Actualizar actividades"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {isLoading && !data &&
          Array.from({ length: DASHBOARD_LIMIT }).map((_, i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-[#F5F5F4]" />
          ))}

        {error && !data && (
          <div className="py-8 text-center text-sm text-red-600">
            <CircleAlert size={32} className="mx-auto mb-2 opacity-60" />
            <p>{error}</p>
            <button type="button" onClick={reload} className="mt-2 text-blue-600 hover:underline">Reintentar</button>
          </div>
        )}

        {data && items.length === 0 && (
          <div className="py-8 text-center text-[#6B6560]">
            <History size={40} className="mx-auto mb-2 opacity-50" />
            <p>Todavía no hay actividad registrada</p>
          </div>
        )}

        {items.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex items-center justify-end border-t border-[#F0EEEC] pt-3">
          <Link
            to={`${basePath}/activity`}
            className="group/link inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3.5 py-2 text-sm font-medium text-white
              transition-[background-color,box-shadow,transform] duration-150 ease-out
              hover:-translate-y-px hover:bg-blue-600 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)]
              active:translate-y-0 active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1
              motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Ver todo
            <ArrowRight size={16} className="transition-transform duration-150 ease-out group-hover/link:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
      )}
    </section>
  );
}

export default RecentActivityPanel;
