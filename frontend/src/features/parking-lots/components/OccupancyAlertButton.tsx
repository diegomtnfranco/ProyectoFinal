import { useEffect } from 'react';
import { Bell, BellRing, LoaderCircle } from 'lucide-react';
import { useOccupancyAlertsStore } from '../../../stores/occupancyAlertsStore';
import { useToast } from '../../../shared/hooks/useToast';

interface OccupancyAlertButtonProps {
  parkingLotId: string;
  parkingLotName: string;
  /** 'compact': versión discreta (más chica, fondo translúcido) para usar sobre la tarjeta. */
  variant?: 'default' | 'compact';
}

/**
 * Campana de la tarjeta: "avisame cuando se libere un lugar". El estado se lee
 * del backend al cargar y se guarda allí (no se pierde al recargar).
 */
function OccupancyAlertButton({ parkingLotId, parkingLotName, variant = 'default' }: OccupancyAlertButtonProps) {
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

  const compact = variant === 'compact';
  const iconSize = compact ? 16 : 20;
  const sizeClass = compact ? 'h-9 w-9' : 'h-11 w-11';
  const idleClass = compact
    ? 'border-gray-200 bg-white/90 text-gray-500 shadow-sm backdrop-blur hover:bg-white hover:text-gray-700'
    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50';

  const label = active ? `Desactivar alerta de lugar libre en ${parkingLotName}` : `Avisarme cuando se libere un lugar en ${parkingLotName}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !loaded}
      aria-pressed={active}
      aria-label={label}
      title={active ? 'Alerta activa: te avisamos cuando se libere un lugar' : 'Avisarme cuando se libere un lugar'}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full border transition disabled:opacity-60 ${
        active ? 'border-amber-400 bg-amber-400 text-white shadow-md hover:bg-amber-500' : idleClass
      }`}
    >
      {busy ? <LoaderCircle size={iconSize} className="animate-spin" /> : active ? <BellRing size={iconSize} /> : <Bell size={iconSize} />}
    </button>
  );
}

export default OccupancyAlertButton;
