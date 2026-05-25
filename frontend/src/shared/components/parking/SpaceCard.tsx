import { CarFront, Motorbike, ParkingMeter, Van } from 'lucide-react';
import {  type Space } from '../../../types/parking.types';
import {VehicleType,SpaceStatus} from '../../../types/auth.types'
const SpaceCard = ({ space }: { space: Space }) => {
    return (
        <div

            key={space.id}
            className={`${space.status === SpaceStatus.OCCUPIED
                    ? space.occupiedByVehicleType === VehicleType.CAR
                        ? 'bg-blue-200'
                        : space.occupiedByVehicleType === VehicleType.MOTORCYCLE
                            ? 'bg-green-200'
                            : 'bg-orange-200'
                    : 'bg-gray-200'
                } rounded-md p-2 text-center text-sm`}
        >
            <p className='bg-slate-50 font-mono font-thin rounded-md'>{space.spaceNumber}</p>
            {space.status === SpaceStatus.OCCUPIED && (
                <div className="text-slate-500 mt-1 w-full align-middle justify-content-center flex items-center gap-1 justify-center">
                    {space.occupiedByVehicleType === VehicleType.CAR && <CarFront size={24} className="text-blue-500" />}
                    {space.occupiedByVehicleType === VehicleType.MOTORCYCLE && <Motorbike size={24} className="text-green-800" />}
                    {space.occupiedByVehicleType === VehicleType.TRUCK && <Van size={24} className="text-orange-800" />}
                    {space.occupiedByVehicleType === undefined && <ParkingMeter size={24} className="text-slate-500" />}
                </div>
            )}
        </div>
    )
}

export default SpaceCard