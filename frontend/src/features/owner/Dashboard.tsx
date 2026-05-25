// import {  CarFront, Motorbike, ParkingMeter, Van, CalendarCheck } from 'lucide-react';
// import {  type Space } from '../../types/parking.types';
// import {VehicleType, SpaceStatus} from '../../types/auth.types'
// import ParkingMap from '../../shared/components/parking/ParkingMap';
// import ReservationPanel from '../../shared/components/reservation/ReservationPanel';

// const spacesList: Space[] = [];
// for (let i = 1; i <= 80; i++) {
//   const esPar = i % 2 === 0;
//   const space: Space = {
//     id: i.toString(),
//     spaceNumber: `P-${i}`,
//     status: (esPar) ? SpaceStatus.OCCUPIED : SpaceStatus.AVAILABLE,
//     allowedVehicleTypes:[VehicleType.CAR,VehicleType.TRUCK,VehicleType.MOTORCYCLE,VehicleType.VAN],
//     occupiedByVehicleType: (esPar) ? ( i>10 ? VehicleType.CAR : i <4 ? VehicleType.MOTORCYCLE : VehicleType.TRUCK) : undefined,
//     allowReservations: (esPar),
//     isReserved: (i % 5 === 0)
//   };
//   spacesList.push(space);
// }

// const spacesByVehicle = Object.groupBy(spacesList, (space) => {
//   return space.occupiedByVehicleType ?? 'NONE';
// });
// const DashboardOwner: React.FC = () => {
//  console.log(spacesByVehicle)
//   return (
//     <div className="space-y-6 flex-col w-full h-full border-2 ">
//       <div className="flex gap-2 w-4/5 h-[50px]  ">
//         <div className="rounded-md w-1/5 flex gap-1  shadow-sm border-red-500 ">

//           <div className='bg-blue-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
//             <CarFront size={32} className='text-blue-500 bg-blue-200 rounded-md ' />
//           </div>
//           <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
//             <p className=" text-slate-500">Autos</p>
//             <span className='font-semibold'>{spacesByVehicle[VehicleType.CAR]?.length || 0}</span>
//             <p className="text-xs text-slate-500">Disponibles</p>
//           </div>

//         </div>
//         <div className="rounded-md w-1/5 flex gap-1 border border-slate-200 bg-white shadow-sm ">

//           <div className='bg-green-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
//             <Motorbike size={32} className='text-green-800 bg-green-200' />
//           </div>
//           <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
//             <p className=" text-slate-500">Motos</p>
//             <span className='font-semibold'>{spacesByVehicle[VehicleType.MOTORCYCLE]?.length || 0}</span>
//             <p className="text-xs text-slate-500">Disponibles</p>
//           </div>

//         </div>

//         <div className="rounded-md w-1/5 flex gap-1 border border-slate-200 bg-white shadow-sm">

//           <div className='bg-orange-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
//             <Van size={32} className='text-orange-800 bg-orange-200' />
//           </div>
//           <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
//             <p className=" text-slate-500">Camionetas</p>
//             <span className='font-semibold'>{spacesByVehicle[VehicleType.TRUCK]?.length || 0}</span>
//             <p className="text-xs text-slate-500">Disponibles</p>
//           </div>
//           {/* 
// {spacesByVehicle['NONE']?.length || 0} */}
//         </div>
//          <div className="rounded-md w-1/5 flex gap-1  shadow-sm border-red-500 ">

//           <div className='bg-violet-500 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
//             <CalendarCheck size={32}className='text-white'/>
                                
              
                                        
//           </div>
//           <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
//             <p className=" text-slate-500">Reservas</p>
//             <span className='font-semibold'>{spacesByVehicle[VehicleType.CAR]?.length || 0}</span>
//             <p className="text-xs text-slate-500">Disponibles</p>
//           </div>

//         </div>
//         <div className="rounded-md w-1/5 flex gap-1 border border-slate-200 bg-white shadow-sm">

//           <div className='bg-slate-200 mx-auto p-1 w-1/3 rounded-l-md flex items-center justify-center'>
//             <ParkingMeter size={32} className='text-slate-500' />
//           </div>

//           <div className="flex-col w-2/3 text-xs p-1 items-center gap-2 font-normal text-slate-900">
//             <p className=" text-slate-500">Disponibles</p>
//             <span className='font-semibold'>          
//             {spacesByVehicle['NONE']?.length || 0}</span>
//             <p className=" text-slate-500">Disponibles</p>
//           </div>

//         </div>
//       </div>
//       <div className="flex gap-4 w-full">

//   <ParkingMap spacesList={spacesList} />

//   <ReservationPanel />

// </div>
     
//     </div>



//   );
// };

// export default DashboardOwner;

// features/owner/Dashboard.tsx
import { useEffect } from 'react';
import { CarFront, Motorbike, ParkingMeter, Van, CalendarCheck } from 'lucide-react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { useSpacesStore } from '../../stores/spacesStore';
import { useOccupancyStore } from '../../stores/occupancyStore';
import { VehicleType, SpaceStatus } from '../../types/auth.types';
import ParkingMap from '../../shared/components/parking/ParkingMap';
import ReservationPanel from '../../shared/components/reservation/ReservationPanel';

const DashboardOwner: React.FC = () => {
  const { currentParkingLot, fetchMyParkingLot, isLoading: parkingLoading } = useParkingLotsStore();
  const { spaces, fetchSpaces, isLoading: spacesLoading } = useSpacesStore();
  const { activeOccupancies, fetchActiveOccupancies } = useOccupancyStore();

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchMyParkingLot();
  }, [fetchMyParkingLot]);

  // Cuando tengamos el parkingLot, cargar sus espacios y ocupaciones
  useEffect(() => {
    if (currentParkingLot?.id) {
      fetchSpaces(currentParkingLot.id);
      fetchActiveOccupancies(currentParkingLot.id);
    }
  }, [currentParkingLot, fetchSpaces, fetchActiveOccupancies]);

  // Calcular estadísticas reales desde los espacios
  const spacesByVehicleType = () => {
    const occupiedByType: Record<string, number> = {
      [VehicleType.CAR]: 0,
      [VehicleType.TRUCK]: 0,
      [VehicleType.MOTORCYCLE]: 0,
      [VehicleType.VAN]: 0,
    };
    const availableSpaces = spaces.filter(s => s.status === SpaceStatus.AVAILABLE).length;

    spaces.forEach(space => {
      if (space.status === SpaceStatus.OCCUPIED && space.occupiedByVehicleType) {
        occupiedByType[space.occupiedByVehicleType]++;
      }
    });

    return { occupiedByType, availableSpaces };
  };

  const { occupiedByType, availableSpaces } = spacesByVehicleType();
  const totalSpaces = spaces.length;
  const occupiedSpaces = spaces.filter(s => s.status === SpaceStatus.OCCUPIED).length;
  const reservedSpaces = spaces.filter(s => s.status === SpaceStatus.RESERVED).length;
  const activeReservationsCount = activeOccupancies.filter(o => o.hasReservation === true).length;
  // Corregido: usar activeOccupancies directamente (son las ocupaciones activas)
  const reservationCount = activeReservationsCount  // ← CAMBIADO: no usar isCompleted

  // Estados de carga
  if (parkingLoading || spacesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando estacionamiento...</p>
        </div>
      </div>
    );
  }

  // Si no hay estacionamiento
  if (!currentParkingLot) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">No tenés un estacionamiento registrado.</p>
          <button 
            onClick={() => window.location.href = '/create-company'}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-xl"
          >
            Crear estacionamiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-col w-full h-full">
      {/* Header con nombre del estacionamiento */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{currentParkingLot.name}</h1>
          <p className="text-gray-500">{currentParkingLot.address}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {currentParkingLot.openTime} - {currentParkingLot.closeTime}
          </p>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="flex gap-2 w-full">
        {/* Autos ocupados */}
        <div className="rounded-md w-1/5 flex gap-1 shadow-sm bg-white p-2">
          <div className='bg-blue-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center'>
            <CarFront size={28} className='text-blue-500' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Autos</p>
            <span className='font-semibold text-lg'>{occupiedByType[VehicleType.CAR]}</span>
            <p className="text-xs text-slate-500">ocupados</p>
          </div>
        </div>

        {/* Motos ocupadas */}
        <div className="rounded-md w-1/5 flex gap-1 bg-white shadow-sm p-2">
          <div className='bg-green-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center'>
            <Motorbike size={28} className='text-green-800' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Motos</p>
            <span className='font-semibold text-lg'>{occupiedByType[VehicleType.MOTORCYCLE]}</span>
            <p className="text-xs text-slate-500">ocupadas</p>
          </div>
        </div>

        {/* Camionetas ocupadas */}
        <div className="rounded-md w-1/5 flex gap-1 bg-white shadow-sm p-2">
          <div className='bg-orange-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center'>
            <Van size={28} className='text-orange-800' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Camionetas</p>
            <span className='font-semibold text-lg'>{occupiedByType[VehicleType.TRUCK]}</span>
            <p className="text-xs text-slate-500">ocupadas</p>
          </div>
        </div>

        {/* Reservas activas */}
        <div className="rounded-md w-1/5 flex gap-1 bg-white shadow-sm p-2">
          <div className='bg-violet-500 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center'>
            <CalendarCheck size={28} className='text-white' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Reservas</p>
            <span className='font-semibold text-lg'>{reservationCount}</span>
            <p className="text-xs text-slate-500">activas</p>
          </div>
        </div>

        {/* Espacios disponibles */}
        <div className="rounded-md w-1/5 flex gap-1 bg-white shadow-sm p-2">
          <div className='bg-slate-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center'>
            <ParkingMeter size={28} className='text-slate-500' />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Disponibles</p>
            <span className='font-semibold text-lg'>{availableSpaces}</span>
            <p className="text-xs text-slate-500">de {totalSpaces}</p>
          </div>
        </div>
      </div>

      {/* Mapa de espacios y panel de reservas */}
      <div className="flex gap-4 w-full">
        <ParkingMap 
          spacesList={spaces} 
          parkingLotId={currentParkingLot.id}
          onRefresh={() => {
            fetchSpaces(currentParkingLot.id);
            fetchActiveOccupancies(currentParkingLot.id);
          }}
        />
        <ReservationPanel />
      </div>
    </div>
  );
};

export default DashboardOwner;