import { useState } from 'react';
import { CarFront, Motorbike, ParkingMeter, Van, Wrench, CalendarCheck } from 'lucide-react';
import { type Space } from '../../../types/parking.types';
import { VehicleType, SpaceStatus } from '../../../types/auth.types';
import { useSpacesStore } from '../../../stores/spacesStore';
import { useUIStore } from '../../../stores/uiStore';
import { useReservationsStore } from '../../../stores/reservationStore';
import { CheckInModal } from '../occupancy/CheckInModal';
import { CheckOutModal } from '../occupancy/CheckOutModal';


interface SpaceCardProps {
    space: Space;
      onSpaceUpdate?: (checkOutResult?: any) => void;
}

type UserVehicleType = 'car' | 'truck' | 'motorcycle' | 'van';

const isValidVehicleType = (value: string): value is UserVehicleType => {
  const validTypes: UserVehicleType[] = ['car', 'truck', 'motorcycle', 'van'];
  return validTypes.includes(value as UserVehicleType);
};

const SpaceCard = ({ space, onSpaceUpdate }: SpaceCardProps) => {
  const [showActions, setShowActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
    useState(false);

  const { updateSpaceStatus, occupySpace, liberateSpace } = useSpacesStore();
  const { showNotification } = useUIStore();
  const { parkingReservations } = useReservationsStore();

  const activeReservation = parkingReservations.find(
    (r) => r.spaceId === space.id && r.status === 'confirmed'
  );

  const getActiveReservationId = (): string | undefined => activeReservation?.id;

  const handleMouseEnter = () => setShowActions(true);
  const handleMouseLeave = () => setShowActions(false);

  const getStatusColor = () => {
    switch (space.status) {
      case SpaceStatus.AVAILABLE:
        return 'bg-green-100 hover:bg-green-200 border-green-300';
      case SpaceStatus.OCCUPIED:
        return 'bg-red-100 border-red-300';
      case SpaceStatus.RESERVED:
        return 'bg-yellow-100 border-yellow-300';
      case SpaceStatus.MAINTENANCE:
        return 'bg-gray-300 border-gray-400';
      default:
        return 'bg-gray-100';
    }
  };

  const getSpaceIcon = () => {
    if (space.status === SpaceStatus.AVAILABLE) return <ParkingMeter size={28} className="text-green-600" />;
    if (space.status === SpaceStatus.RESERVED) return <CalendarCheck size={28} className="text-yellow-600" />;
    if (space.status === SpaceStatus.MAINTENANCE) return <Wrench size={28} className="text-gray-600" />;
    if (space.status === SpaceStatus.OCCUPIED) {
      switch (space.occupiedByVehicleType) {
        case VehicleType.CAR: return <CarFront size={28} className="text-blue-600" />;
        case VehicleType.MOTORCYCLE: return <Motorbike size={28} className="text-green-600" />;
        case VehicleType.TRUCK: return <Van size={28} className="text-orange-600" />;
        default: return <ParkingMeter size={28} className="text-red-600" />;
      }
    }
    return <ParkingMeter size={28} className="text-gray-500" />;
  };

  const getStatusText = () => {
    switch (space.status) {
      case SpaceStatus.AVAILABLE: return 'Disponible';
      case SpaceStatus.OCCUPIED: return `Ocupado por ${space.occupiedByVehiclePlate || 'vehículo'}`;
      case SpaceStatus.RESERVED: return 'Reservado';
      case SpaceStatus.MAINTENANCE: return 'Mantenimiento';
      default: return '';
    }
  };

  const handleOccupy = async () => {
    console.log(activeReservation);
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

  const handleModalConfirm = async (plate: string, vehicleType: UserVehicleType) => {
    setShowCheckInModal(false);
    setIsLoading(true);
    try {
      const reservationId = getActiveReservationId();
      await occupySpace(space.id, plate, vehicleType, reservationId);
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
    console.log("RESULTADO CHECKOUT", result);

    setShowCheckOutModal(false);

    showNotification(
      `Espacio ${space.spaceNumber} liberado correctamente`,
      "success"
    );

    onSpaceUpdate?.(result);
    console.log("ENVIANDO RESULTADO AL PARKINGMAP");

  } catch (error) {

    showNotification(error as string, "error");

  } finally {

    setIsLoading(false);

  }
};


  const handleMaintenance = async () => {
    setIsLoading(true);
    try {
      await updateSpaceStatus(space.id, { status: SpaceStatus.MAINTENANCE });
      showNotification(`Espacio ${space.spaceNumber} en mantenimiento`, 'info');
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

  const showActionButtons = showActions && !isLoading;

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative rounded-md p-3 text-center transition-all duration-200 border-2 ${getStatusColor()} ${
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <p className="bg-white/80 flex justify-center font-mono font-semibold rounded-md text-xs py-1 px-2 mb-1">
          {space.spaceNumber}
        </p>
        <div className="flex justify-center my-2">{getSpaceIcon()}</div>
        <p className="text-xs font-medium text-gray-700 truncate">{getStatusText()}</p>
        {showActionButtons && (
          <div className="absolute inset-0 bg-black/70 rounded-md flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
            {space.status === SpaceStatus.AVAILABLE && (
              <button onClick={handleOccupy} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-md transition-all">
                Ocupar
              </button>
            )}
            {space.status === SpaceStatus.OCCUPIED && (
              <button onClick={handleLiberate} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-md transition-all">
                Liberar
              </button>
            )}
            {space.status === SpaceStatus.RESERVED && (
              <>
                <button onClick={handleOccupy} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-md transition-all">
                  Check-in
                </button>
                <button onClick={handleMaintenance} className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1 rounded-md transition-all">
                  Mantenimiento
                </button>
              </>
            )}
            {space.status === SpaceStatus.MAINTENANCE && (
              <button onClick={handleAvailable} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-md transition-all">
                Disponible
              </button>
            )}
          </div>
        )}
      </div>

      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onConfirm={handleModalConfirm}
        isLoading={isLoading}
      />
      
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