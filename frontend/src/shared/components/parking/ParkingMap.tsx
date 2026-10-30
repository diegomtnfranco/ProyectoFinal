
import { useState } from 'react';
import SpaceCard from './SpaceCard';
import type { Space } from '../../../types/parking.types';
import { SpaceStatus } from '../../../types/auth.types';
import { useSpacesStore } from '../../../stores/spacesStore';
import { useReservationsStore } from '../../../stores/reservationStore';

interface ParkingMapProps {
  spacesList: Space[];
  parkingLotId?: string;
  onRefresh?: () => void;
  className?: string;
  onManualCheckout?: (result: any) => void;
}

const ParkingMap = ({
  spacesList,
  parkingLotId,
  onRefresh,
  className = '',
  onManualCheckout,
}: ParkingMapProps) => {
  const [searchPlate, setSearchPlate] = useState('');

  const { fetchSpaces } = useSpacesStore();
  const { parkingReservations } = useReservationsStore();

  const handleSpaceUpdate = (result?: any) => {
    if (parkingLotId) {
      fetchSpaces(parkingLotId);
    }

    onRefresh?.();

    if (result) {
      onManualCheckout?.(result);
    }
  };

  const normalizePlate = (plate: string) =>
    plate.replace(/\s/g, '').toUpperCase();

  const filteredSpaces = spacesList.filter((space) => {
    const search = normalizePlate(searchPlate.trim());

    if (!search) return true;

    const activeReservation = parkingReservations.find(
      (reservation) =>
        reservation.spaceId === space.id &&
        reservation.status === 'confirmed'
    );

    const plate =
      space.status === SpaceStatus.OCCUPIED
        ? space.occupiedByVehiclePlate || ''
        : space.status === SpaceStatus.RESERVED
          ? activeReservation?.vehiclePlate || ''
          : '';

    return normalizePlate(plate).includes(search);
  });

  return (
    <div
      className={`rounded-md border-2 bg-white p-6 shadow-sm min-h-[350px] ${className}`}
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={searchPlate}
          onChange={(event) => setSearchPlate(event.target.value)}
          placeholder="Buscar por patente..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="button"
          onClick={() => setSearchPlate('')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Limpiar búsqueda
        </button>
      </div>

      {filteredSpaces.length === 0 ? (
        <div className="flex min-h-[250px] items-center justify-center text-center text-slate-500">
          {searchPlate.trim()
            ? 'No se encontraron espacios con esa patente.'
            : 'No hay espacios disponibles.'}
        </div>
      ) : (
        <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2 auto-rows-max">
          {filteredSpaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onSpaceUpdate={handleSpaceUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParkingMap;
