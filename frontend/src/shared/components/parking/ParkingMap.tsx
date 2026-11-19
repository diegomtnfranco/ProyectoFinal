
import { useState } from 'react';
import { Search, X } from 'lucide-react';
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

  const hasSearch = searchPlate.trim().length > 0;

  return (
    <div
      className={`min-h-[350px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por patente</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchPlate}
            onChange={(event) => setSearchPlate(event.target.value)}
            placeholder="Buscar por patente..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none
              transition-[border-color,box-shadow,background-color] duration-200 ease-out
              placeholder:text-slate-400 hover:border-slate-300
              focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/70"
          />
        </label>

        <button
          type="button"
          onClick={() => setSearchPlate('')}
          disabled={!hasSearch}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600
            transition-[background-color,border-color,color,transform,opacity] duration-150 ease-out
            hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900
            active:translate-y-0 active:scale-[0.97]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1
            disabled:pointer-events-none disabled:opacity-50
            motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
        >
          <X size={14} aria-hidden="true" />
          Limpiar búsqueda
        </button>
      </div>

      {filteredSpaces.length === 0 ? (
        <div className="flex min-h-[250px] items-center justify-center text-center text-sm text-slate-500">
          {hasSearch
            ? 'No se encontraron espacios con esa patente.'
            : 'No hay espacios disponibles.'}
        </div>
      ) : (
        // Cuadrícula de 8 columnas que llega hasta el borde del recuadro; las filas
        // salen de la cantidad de lugares (baja columnas solo en pantallas angostas, ver index.css).
        <div className="spot-grid-wrap w-full">
          <div className="spot-grid">
            {filteredSpaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onSpaceUpdate={handleSpaceUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingMap;
