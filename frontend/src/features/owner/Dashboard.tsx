import {  CarFront, Motorbike, ParkingMeter, Van } from 'lucide-react';
import {  type Space } from '../../types/parking.types';
import {VehicleType, SpaceStatus} from '../../types/auth.types'
import ParkingMap from '../../shared/components/parking/ParkingMap';

const spacesList: Space[] = [];
for (let i = 1; i <= 28; i++) {
  const esPar = i % 2 === 0;
  const space: Space = {
    id: i.toString(),
    spaceNumber: `P-${i}`,
    status: (esPar) ? SpaceStatus.OCCUPIED : SpaceStatus.AVAILABLE,
    allowedVehicleTypes:[VehicleType.CAR,VehicleType.TRUCK,VehicleType.MOTORCYCLE,VehicleType.VAN],
    occupiedByVehicleType: (esPar) ? ( i>10 ? VehicleType.CAR : i <4 ? VehicleType.MOTORCYCLE : VehicleType.TRUCK) : undefined,
    allowReservations: (esPar),
    isReserved: (i % 5 === 0)
  };
  spacesList.push(space);
}

const spacesByVehicle = Object.groupBy(spacesList, (space) => {
  return space.occupiedByVehicleType ?? 'NONE';
});
const DashboardOwner: React.FC = () => {
 console.log(spacesByVehicle)
  return (
    <div className="space-y-6 flex-col w-full h-full ">
      <div className="flex gap-2 w-4/5 h-[50px]">
        <div className="rounded-md w-1/5 flex gap-1 border border-slate-200 bg-white shadow-sm ">

          <div className='bg-blue-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
            <CarFront size={32} className='text-blue-500 bg-blue-200 rounded-md ' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
            <p className=" text-slate-500">Autos</p>
            <span className='font-semibold'>{spacesByVehicle[VehicleType.CAR]?.length || 0}</span>
            <p className="text-xs text-slate-500">Disponibles</p>
          </div>

        </div>
        <div className="rounded-md w-1/5 flex gap-1 border border-slate-200 bg-white shadow-sm ">

          <div className='bg-green-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
            <Motorbike size={32} className='text-green-800 bg-green-200' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
            <p className=" text-slate-500">Motos</p>
            <span className='font-semibold'>{spacesByVehicle[VehicleType.MOTORCYCLE]?.length || 0}</span>
            <p className="text-xs text-slate-500">Disponibles</p>
          </div>

        </div>

        <div className="rounded-md w-1/5 flex gap-1 border border-slate-200 bg-white shadow-sm">

          <div className='bg-orange-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
            <Van size={32} className='text-orange-800 bg-orange-200' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
            <p className=" text-slate-500">Camionetas</p>
            <span className='font-semibold'>{spacesByVehicle[VehicleType.TRUCK]?.length || 0}</span>
            <p className="text-xs text-slate-500">Disponibles</p>
          </div>
          {/* 
{spacesByVehicle['NONE']?.length || 0} */}
        </div>
        <div className="rounded-md w-1/5 flex gap-1 border border-slate-200 bg-white shadow-sm">

          <div className='bg-slate-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
            <ParkingMeter size={32} className='text-slate-500' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
            <p className=" text-slate-500">Disponibles</p>
            <span className='font-semibold'>          
            {spacesByVehicle['NONE']?.length || 0}</span>
            <p className=" text-slate-500">Disponibles</p>
          </div>

        </div>
      </div>
      <ParkingMap spacesList={spacesList} />
     
    </div>



  );
};

export default DashboardOwner;
