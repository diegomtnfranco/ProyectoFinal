import { useEffect } from 'react';
import { Bell, BellRing, LoaderCircle } from 'lucide-react';
import { useOccupancyAlertsStore } from '../../../stores/occupancyAlertsStore';
import { useToast } from '../../../shared/hooks/useToast';

interface OccupancyAlertButtonProps {
  parkingLotId: string;
  parkingLotName: string;
}

/**
 * Campana de la tarjeta: "avisame cuando se libere un lugar". El estado se lee
 * del backend al cargar y se guarda allí (no se pierde al recargar).
 */
function OccupancyAlertButton({ parkingLotId, parkingLotName }: OccupancyAlertButtonProps) {
  const { subscribed, loaded, pending, load, toggle } = useOccupancyAlertsStore();
  const { showSuccess, showError } = useToast();
  const active = subscribed.has(parkingLotId);
  const busy = pending.has(parkingLotId);

  useEffect(() => {
    if (!loaded) void load().catch(() => undefined);
  }, [loaded, load]);

  const handleClick = async (e: React.MouseEvent) => {
    // Independiente de la navegación de la tarjeta
    e.preventDefault();
    e.stopPropagation();
    try {
      const nowActive = await toggle(parkingLotId);
      showSuccess(nowActive ? `Te avisaremos cuando se libere un lugar en ${parkingLotName}` : 'Alerta desactivada');
    } catch (err) {
      showError(typeof err === 'string' ? err : 'No se pudo actualizar la alerta');
    }
  };

  const label = active ? `Desactivar alerta de lugar libre en ${parkingLotName}` : `Avisarme cuando se libere un lugar en ${parkingLotName}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !loaded}
      aria-pressed={active}
      aria-label={label}
      title={active ? 'Alerta activa: te avisamos cuando se libere un lugar' : 'Avisarme cuando se libere un lugar'}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-60 ${
        active ? 'border-amber-400 bg-amber-400 text-white shadow-md hover:bg-amber-500' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {busy ? <LoaderCircle size={20} className="animate-spin" /> : active ? <BellRing size={20} /> : <Bell size={20} />}
    </button>
  );
}

export default OccupancyAlertButton;
