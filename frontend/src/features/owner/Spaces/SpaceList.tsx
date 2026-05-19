import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useParkingStore from '../../../stores/parkingStore';

const SpaceList: React.FC = () => {
  const { parkingLotId } = useParams();
  const {  loadSpaces, loadParkingLot, isLoading } = useParkingStore();

  useEffect(() => {
    if (parkingLotId) {
      loadParkingLot(parkingLotId);
      loadSpaces(parkingLotId);
    }
  }, [parkingLotId, loadParkingLot, loadSpaces]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Espacios</h1>
          <p className="mt-2 text-sm text-slate-500">Gestiona los espacios y su estado de disponibilidad.</p>
        </div>
        <Link to={`/owner/spaces/${parkingLotId}/new`} className="rounded-3xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700">
          Agregar espacio
        </Link>
      </div>
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Cargando espacios...</div>
      ) : (''      )}
    </div>
  );
};

export default SpaceList;
