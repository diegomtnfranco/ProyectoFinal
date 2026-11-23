import { useState } from 'react';
import { CalendarClock, History } from 'lucide-react';
import ReservationPanel from '../reservation/ReservationPanel';
import RecentActivityPanel from './RecentActivityPanel';
import { useReservationsStore } from '../../../stores/reservationStore';

type SideTab = 'requests' | 'activity';

const STORAGE_KEY = 'dashboard:sidePanelTab';

const readStoredTab = (): SideTab => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'activity' || value === 'requests' ? value : 'requests';
  } catch {
    return 'requests';
  }
};

interface DashboardSidePanelProps {
  parkingLotId: string;
  className?: string;
}

/**
 * Columna derecha del dashboard: agrupa en pestañas el panel existente de
 * "Solicitudes de Reserva" (sin modificarlo) y el nuevo "Últimas actividades".
 */
function DashboardSidePanel({ parkingLotId, className = '' }: DashboardSidePanelProps) {
  const [tab, setTab] = useState<SideTab>(readStoredTab);
  const pendingCount = useReservationsStore(
    (s) => s.parkingReservations.filter((r) => r.status === 'pending_confirmation').length,
  );


  const selectTab = (next: SideTab) => {
  setTab(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // si no se puede guardar, el tab igual funciona en memoria
  }
};

  const tabClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
      active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div role="tablist" aria-label="Panel lateral" className="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button role="tab" aria-selected={tab === 'requests'} onClick={() => selectTab('requests')} className={tabClass(tab === 'requests')}>
          <CalendarClock size={16} />
          Solicitudes
          {pendingCount > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">{pendingCount}</span>
          )}
        </button>
        <button role="tab" aria-selected={tab === 'activity'} onClick={() => selectTab('activity')} className={tabClass(tab === 'activity')}>
          <History size={16} />
          Actividad
        </button>
      </div>

      {tab === 'requests' ? (
        <ReservationPanel className="w-full flex-1" />
      ) : (
        <RecentActivityPanel parkingLotId={parkingLotId} className="w-full flex-1" />
      )}
    </div>
  );
}

export default DashboardSidePanel;
