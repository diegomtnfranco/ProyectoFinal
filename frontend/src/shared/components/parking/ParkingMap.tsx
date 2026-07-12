// import { useEffect } from 'react';
// import SpaceCard from "./SpaceCard";
// import type { Space } from "../../../types/parking.types";
// import { useSpacesStore } from '../../../stores/spacesStore';

// interface ParkingMapProps {
//   spacesList: Space[];
//   parkingLotId?: string;
//   onRefresh?: () => void;
// }

// const ParkingMap = ({ spacesList, parkingLotId, onRefresh }: ParkingMapProps) => {
//   const { fetchSpaces } = useSpacesStore();

//   const handleSpaceUpdate = () => {
//     if (parkingLotId) {
//       fetchSpaces(parkingLotId);
//     }
//     onRefresh?.();
//   };

//   if (spacesList.length === 0) {
//     return (
//       <div className="rounded-md w-4/6 box-border flex border-2 bg-white p-6 shadow-sm min-h-[350px] items-center justify-center">
//         <p className="text-slate-500">No hay espacios disponibles.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="rounded-md w-4/6 box-border flex border-2 bg-white p-6 shadow-sm min-h-[350px]">
//       <div className="w-full grid md:grid-cols-10 grid-cols-3 gap-3 auto-rows-max">
//         {spacesList.map((space) => (
//           <SpaceCard 
//             key={space.id} 
//             space={space} 
//             onSpaceUpdate={handleSpaceUpdate}
//           />
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ParkingMap;


import { useState, useEffect } from 'react';
import SpaceCard from './SpaceCard';
import type { Space } from '../../../types/parking.types';
import { useSpacesStore } from '../../../stores/spacesStore';

interface ParkingMapProps {
  spacesList: Space[];
  parkingLotId?: string;
  onRefresh?: () => void;
  className?: string;
  onManualCheckout?: (result: any) => void;
}


const ParkingMap = ({ spacesList, parkingLotId, onRefresh, className = '', onManualCheckout, }: ParkingMapProps) => {


  useEffect(() => { return () => {  }; }, []);

  const { fetchSpaces } = useSpacesStore();

const handleSpaceUpdate = (result?: any) => {

    if (parkingLotId) {
        fetchSpaces(parkingLotId);
    }

    onRefresh?.();

    if (result) {
        onManualCheckout?.(result);
    }
};




  return (
    <div className={`rounded-md border-2 bg-white p-6 shadow-sm min-h-[350px] ${className}`}>
      <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2 auto-rows-max">
        {spacesList.map((space) => (
          <SpaceCard key={space.id} space={space} onSpaceUpdate={handleSpaceUpdate} />
        ))}
      </div>

      
    </div>

    
  );
};

export default ParkingMap;