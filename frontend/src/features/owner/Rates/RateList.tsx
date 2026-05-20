import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import useParkingStore from '../../../stores/parkingStore';
import type { Rate } from '../../../types/parking.types';

const RateList: React.FC = () => {
  const { parkingLotId } = useParams();
  const { rates, loadRates } = useParkingStore();

  useEffect(() => {
    if (parkingLotId) loadRates(parkingLotId);
  }, [parkingLotId, loadRates]);

  return (
    <div className="space-y-6 m-auto">
      {/* <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tarifas</h1>
          <p className="mt-2 text-sm text-slate-500">Administra precios por hora y horarios especiales.</p>
        </div>
        <Link to={`/owner/rates/${parkingLotId}/new`} className="rounded-3xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700">
          Agregar tarifa
        </Link>
      </div> */}
      <div className="grid gap-4 rounded-md w-full border border-slate-200 bg-white shadow-sm  ">
        
        {rates.length === 0 ? (
          <h2 className="text-slate-500 animate-pulse font-semibold">No hay tarifas definidas para este estacionamiento.</h2>
        ) :  
        
        rates.map((rate: Rate) => (
          <div key={rate.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{rate.vehicleType.toUpperCase()}</h2>
                <p className="mt-1 text-sm text-slate-600">{rate.vehicleType} — {rate.rateType}</p>
              </div>
              <p className="text-lg font-semibold text-slate-900">${rate.pricePerHour}/h</p>
            </div>
          </div>
        ))}
       
      </div>
    </div>
  );
};

export default RateList;
