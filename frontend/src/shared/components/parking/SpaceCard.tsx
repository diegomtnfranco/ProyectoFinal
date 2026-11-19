import { useState } from 'react';
import { Car, Motorbike, SquareParking, Van, Wrench, CalendarCheck } from 'lucide-react';
import { type Space } from '../../../types/parking.types';
import { VehicleType, SpaceStatus } from '../../../types/auth.types';
import { useSpacesStore } from '../../../stores/spacesStore';
import { useToast } from '../../hooks/useToast';
import { useReservationsStore } from '../../../stores/reservationStore';
import { CheckInModal } from '../occupancy/CheckInModal';
import { CheckOutModal } from '../occupancy/CheckOutModal';
import { OccupancyServicesModal } from '../occupancy/OccupancyServicesModal';


interface SpaceCardProps {
  space: Space;
  onSpaceUpdate?: (checkOutResult?: any) => void;
}

type UserVehicleType = 'car' | 'truck' | 'motorcycle' | 'van';

/* ------------------------------------------------------------------
 * Estilos de la tarjeta (spec "Tarjetas de estacionamiento").
 * Proporción 3:4 (132 × 176 de referencia) · borde 1,5 px · Inter.
 * La tarjeta ocupa todo el ancho de su celda; las medidas internas escalan
 * con ese ancho mediante las clases .spot-* definidas en index.css.
 * Las clases van completas (no concatenadas) para que Tailwind las detecte.
 * ------------------------------------------------------------------ */
type Variant = {
  card: string;      // fondo + borde + sombra (reposo y hover)
  pill: string;      // borde y texto de la pastilla del número
  icon: string;      // color del ícono
  label: string;     // color del texto de estado
  overlay: string;   // fondo de la zona de botones
  primary: string;   // botón principal
  secondary: string; // botón secundario
};

const VARIANTS: Record<string, Variant> = {
  [SpaceStatus.RESERVED]: {
    card:
      'bg-[#FFF7E0] border-[#F6C344] shadow-[0_1px_2px_rgba(122,74,0,0.06)] ' +
      'group-hover:border-[#F59E0B] group-hover:shadow-[0_8px_24px_rgba(245,158,11,0.28)] ' +
      'group-focus-within:border-[#F59E0B] group-focus-within:shadow-[0_8px_24px_rgba(245,158,11,0.28)]',
    pill: 'border-[#F3D27A] text-[#5C3900]',
    icon: 'text-[#E07B00]',
    label: 'text-[#8A5300]',
    overlay: 'bg-[#FFF7E0]',
    primary:
      'bg-[#F7931E] text-[#2E1A00] hover:bg-[#E8800A] hover:shadow-[0_4px_12px_rgba(232,128,10,0.35)] focus-visible:ring-[#E8800A]',
    secondary:
      'bg-white border border-[#F3C969] text-[#7A4A00] hover:bg-[#FFF1CC] focus-visible:ring-[#F59E0B]',
  },
  [SpaceStatus.AVAILABLE]: {
    card:
      'bg-[#ECFBF1] border-[#6FD49A] shadow-[0_1px_2px_rgba(21,128,61,0.06)] ' +
      'group-hover:border-[#22A55A] group-hover:shadow-[0_8px_24px_rgba(34,165,90,0.26)] ' +
      'group-focus-within:border-[#22A55A] group-focus-within:shadow-[0_8px_24px_rgba(34,165,90,0.26)]',
    pill: 'border-[#A7E5BF] text-[#0F3D22]',
    icon: 'text-[#16A34A]',
    label: 'text-[#166534]',
    overlay: 'bg-[#ECFBF1]',
    primary:
      'bg-[#22C55E] text-[#052E16] hover:bg-[#1DB954] hover:shadow-[0_4px_12px_rgba(29,185,84,0.35)] focus-visible:ring-[#16A34A]',
    secondary: '',
  },
  [SpaceStatus.OCCUPIED]: {
    card:
      'bg-[#FFF0EE] border-[#F59A92] shadow-[0_1px_2px_rgba(153,27,27,0.06)] ' +
      'group-hover:border-[#E5484D] group-hover:shadow-[0_8px_24px_rgba(229,72,77,0.24)] ' +
      'group-focus-within:border-[#E5484D] group-focus-within:shadow-[0_8px_24px_rgba(229,72,77,0.24)]',
    pill: 'border-[#F8C4BF] text-[#5C1010]',
    icon: 'text-[#DC2626]',
    label: 'text-[#9F1D1D]',
    overlay: 'bg-[#FFF0EE]',
    primary:
      'bg-[#DC2626] text-white hover:bg-[#B91C1C] hover:shadow-[0_4px_12px_rgba(185,28,28,0.35)] focus-visible:ring-[#B91C1C]',
    secondary:
      'bg-white border border-[#F5B5AF] text-[#8F1D1D] hover:bg-[#FFE4E1] focus-visible:ring-[#E5484D]',
  },
  // Mantenimiento: no está en la spec; se resuelve con la misma estructura en grises.
  [SpaceStatus.MAINTENANCE]: {
    card:
      'bg-[#F4F5F7] border-[#C9CED6] shadow-[0_1px_2px_rgba(51,65,85,0.06)] ' +
      'group-hover:border-[#8A94A3] group-hover:shadow-[0_8px_24px_rgba(100,116,139,0.24)] ' +
      'group-focus-within:border-[#8A94A3] group-focus-within:shadow-[0_8px_24px_rgba(100,116,139,0.24)]',
    pill: 'border-[#D5DAE1] text-[#1F2937]',
    icon: 'text-[#64748B]',
    label: 'text-[#475569]',
    overlay: 'bg-[#F4F5F7]',
    primary:
      'bg-[#334155] text-white hover:bg-[#1E293B] hover:shadow-[0_4px_12px_rgba(30,41,59,0.30)] focus-visible:ring-[#334155]',
    secondary: '',
  },
};

// Base compartida de los botones: solo texto, transiciones cortas y "press" sutil.
const BTN_BASE =
  'w-full rounded-[10px] font-semibold select-none ' +
  'transition-[background-color,box-shadow,transform] duration-150 ease-out ' +
  'hover:-translate-y-px active:translate-y-0 active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ' +
  'disabled:opacity-60 disabled:pointer-events-none';
const BTN_STACKED = `${BTN_BASE} spot-btn flex-1`;
const BTN_SINGLE = `${BTN_BASE} spot-btn spot-btn-single`;

const SpaceCard = ({ space, onSpaceUpdate }: SpaceCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  // "Ajustes" de una reserva: muestra las opciones secundarias dentro de la tarjeta.
  const [showReservedSettings, setShowReservedSettings] = useState(false);

  const { updateSpaceStatus, occupySpace, liberateSpace } = useSpacesStore();
  // Los avisos usan sonner (<Toaster /> ya montado en App): son popups temporales.
  const { showSuccess, showError, showInfo } = useToast();
  const showNotification = (message: unknown, type: 'success' | 'error' | 'info') => {
    const text = Array.isArray(message) ? message.join('. ') : String(message ?? '');
    if (type === 'success') showSuccess(text);
    else if (type === 'error') showError(text || 'Ocurrió un error inesperado');
    else showInfo(text);
  };
  const { parkingReservations } = useReservationsStore();

  const activeReservation = parkingReservations.find(
    (r) => r.spaceId === space.id && r.status === 'confirmed'
  );

  const getActiveReservationId = (): string | undefined => activeReservation?.id;

  const variant = VARIANTS[space.status] ?? VARIANTS[SpaceStatus.MAINTENANCE];

  const getSpaceIcon = () => {
    // El tamaño real lo define .spot-icon (escala con el ancho de la tarjeta).
    const props = { strokeWidth: 1.8, 'aria-hidden': true, className: 'h-full w-full' } as const;
    switch (space.status) {
      case SpaceStatus.AVAILABLE:
        return <SquareParking {...props} />;
      case SpaceStatus.RESERVED:
        return <CalendarCheck {...props} />;
      case SpaceStatus.MAINTENANCE:
        return <Wrench {...props} />;
      case SpaceStatus.OCCUPIED:
        switch (space.occupiedByVehicleType) {
          case VehicleType.MOTORCYCLE:
            return <Motorbike {...props} />;
          case VehicleType.TRUCK:
          case VehicleType.VAN:
            return <Van {...props} />;
          default:
            return <Car {...props} />;
        }
      default:
        return <SquareParking {...props} />;
    }
  };

  // Patente del vehículo del lugar: reemplaza al número mientras dura el hover.
  const plate =
    space.status === SpaceStatus.OCCUPIED
      ? space.occupiedByVehiclePlate
      : space.status === SpaceStatus.RESERVED
        ? activeReservation?.vehiclePlate
        : undefined;

  const getStatusText = () => {
    switch (space.status) {
      case SpaceStatus.AVAILABLE:
        return 'Libre';
      case SpaceStatus.OCCUPIED:
        return 'Ocupado';
      case SpaceStatus.RESERVED:
        return 'Reserva';
      case SpaceStatus.MAINTENANCE:
        return 'Mantenimiento';
      default:
        return '';
    }
  };

  const handleOccupy = async () => {
    if (space.status === SpaceStatus.RESERVED && activeReservation) {
      setIsLoading(true);
      try {
        await occupySpace(space.id, activeReservation.vehiclePlate, activeReservation.vehicleType, activeReservation.id);
        showNotification(`Check-in realizado para espacio ${space.spaceNumber}`, 'success');
        onSpaceUpdate?.();
      } catch (error) {
        showNotification(error as string, 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setShowCheckInModal(true);
  };

  const handleModalConfirm = async (plate: string, vehicleType: UserVehicleType, serviceKeys?: string[]) => {
    setShowCheckInModal(false);
    setIsLoading(true);
    try {
      const reservationId = getActiveReservationId();
      await occupySpace(space.id, plate, vehicleType, reservationId, serviceKeys);
      showNotification(`Espacio ${space.spaceNumber} ocupado correctamente`, 'success');
      onSpaceUpdate?.();
    } catch (error) {
      showNotification(error as string, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLiberate = () => {
    setShowCheckOutModal(true);
  };

  const handleConfirmLiberate = async () => {
    setIsLoading(true);
    try {
      const result = await liberateSpace(space.id);
      setShowCheckOutModal(false);
      showNotification(`Espacio ${space.spaceNumber} liberado correctamente`, 'success');
      onSpaceUpdate?.(result);
    } catch (error) {
      showNotification(error as string, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaintenance = async () => {
    setIsLoading(true);
    try {
      await updateSpaceStatus(space.id, { status: SpaceStatus.MAINTENANCE });
      showNotification(`Espacio ${space.spaceNumber} en mantenimiento`, 'info');
      setShowReservedSettings(false);
      onSpaceUpdate?.();
    } catch (error) {
      showNotification(error as string, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvailable = async () => {
    setIsLoading(true);
    try {
      await updateSpaceStatus(space.id, { status: SpaceStatus.AVAILABLE });
      showNotification(`Espacio ${space.spaceNumber} disponible`, 'success');
      onSpaceUpdate?.();
    } catch (error) {
      showNotification(error as string, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Al salir de la tarjeta (mouse o foco) se vuelve al estado inicial.
  const resetPanel = () => setShowReservedSettings(false);
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resetPanel();
  };

  const renderButtons = () => {
    switch (space.status) {
      case SpaceStatus.AVAILABLE:
        return (
          <button type="button" onClick={handleOccupy} disabled={isLoading} className={`${BTN_SINGLE} ${variant.primary}`}>
            Ocupar
          </button>
        );
      case SpaceStatus.OCCUPIED:
        return (
          <>
            <button type="button" onClick={handleLiberate} disabled={isLoading} className={`${BTN_STACKED} ${variant.primary}`}>
              Egreso
            </button>
            <button
              type="button"
              onClick={() => setShowServicesModal(true)}
              disabled={isLoading}
              className={`${BTN_STACKED} ${variant.secondary}`}
            >
              Ajustes
            </button>
          </>
        );
      case SpaceStatus.RESERVED:
        return showReservedSettings ? (
          <>
            <button type="button" onClick={handleMaintenance} disabled={isLoading} className={`${BTN_STACKED} ${variant.primary}`}>
              Mantenimiento
            </button>
            <button type="button" onClick={resetPanel} disabled={isLoading} className={`${BTN_STACKED} ${variant.secondary}`}>
              Volver
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={handleOccupy} disabled={isLoading} className={`${BTN_STACKED} ${variant.primary}`}>
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setShowReservedSettings(true)}
              disabled={isLoading}
              className={`${BTN_STACKED} ${variant.secondary}`}
            >
              Ajustes
            </button>
          </>
        );
      case SpaceStatus.MAINTENANCE:
        return (
          <button type="button" onClick={handleAvailable} disabled={isLoading} className={`${BTN_SINGLE} ${variant.primary}`}>
            Habilitar
          </button>
        );
      default:
        return null;
    }
  };

  const isSingle = space.status === SpaceStatus.AVAILABLE || space.status === SpaceStatus.MAINTENANCE;
  const statusText = getStatusText();

  return (
    <>
      {/* .spot-cell es el contenedor de referencia: todo dentro escala con su ancho */}
      <div className="spot-cell">
      <div
        role="group"
        tabIndex={0}
        aria-label={`Lugar ${space.spaceNumber}: ${statusText}${plate ? `, patente ${plate}` : ''}`}
        aria-busy={isLoading}
        onMouseLeave={resetPanel}
        onBlur={handleBlur}
        className={`spot-card group relative aspect-[3/4] w-full overflow-hidden border-[1.5px] font-['Inter',ui-sans-serif,system-ui,sans-serif] outline-none
          transition-[border-color,box-shadow,opacity] duration-200 ease-out motion-reduce:transition-none
          focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2
          ${variant.card} ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {/* Número de lugar; en hover/foco se reemplaza por la patente (si hay vehículo) */}
        <div className="spot-pill-wrap absolute inset-x-0 flex justify-center">
          <div className="grid justify-items-center">
            <span
              className={`spot-pill [grid-area:1/1] border bg-white font-bold leading-none tracking-[0.06em] tabular-nums ${variant.pill}
                transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none
                ${plate ? 'group-hover:-translate-y-1 group-hover:opacity-0 group-focus-within:-translate-y-1 group-focus-within:opacity-0' : ''}`}
            >
              <span className="relative top-px">{space.spaceNumber}</span>
            </span>
            {plate && (
              <span
                aria-hidden="true"
                className={`spot-pill [grid-area:1/1] whitespace-nowrap border bg-white font-bold uppercase leading-none tracking-[0.04em] tabular-nums ${variant.pill}
                  translate-y-1 opacity-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none
                  group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100`}
              >
                <span className="relative top-px">{plate}</span>
              </span>
            )}
          </div>
        </div>

        {/* Ícono: fijo, termina por encima de la zona de botones */}
        <div className={`spot-icon-wrap absolute inset-x-0 flex justify-center ${variant.icon}`}>
          <span className="spot-icon block">{getSpaceIcon()}</span>
        </div>

        {/* Estado: se desvanece en hover */}
        <p
          className={`spot-label pointer-events-none absolute inset-x-1 m-0 text-center font-semibold leading-[1.2] ${variant.label}
            transition-opacity duration-150 ease-out group-hover:opacity-0 group-focus-within:opacity-0 motion-reduce:transition-none`}
        >
          {statusText}
        </p>

        {/* Zona de botones: mitad inferior, aparece con hover o foco (sube 8 px) */}
        <div
          className={`spot-actions absolute inset-x-0 bottom-0 flex h-1/2 flex-col ${isSingle ? 'justify-center' : ''} ${variant.overlay}
            pointer-events-none translate-y-2 opacity-0 transition-[opacity,transform] duration-200 ease-out
            group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100
            group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100
            motion-reduce:translate-y-0 motion-reduce:transition-none`}
        >
          {renderButtons()}
        </div>
      </div>
      </div>

      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onConfirm={handleModalConfirm}
        isLoading={isLoading}
        parkingLotId={space.parkingLotId}
      />

      {showServicesModal && (
        <OccupancyServicesModal isOpen={showServicesModal} spaceId={space.id} onClose={() => setShowServicesModal(false)} />
      )}

      <CheckOutModal
        isOpen={showCheckOutModal}
        onClose={() => setShowCheckOutModal(false)}
        onConfirm={handleConfirmLiberate}
        spaceNumber={space.spaceNumber}
        vehiclePlate={space.occupiedByVehiclePlate}
        isLoading={isLoading}
      />
    </>
  );
};

export default SpaceCard;
