import { CarFront, Motorbike, ParkingMeter, Van } from 'lucide-react';
import { SpaceStatus, type Space, VehicleType } from '../../../types/parking.types';

const SpaceCard = ({ space }: { space: Space }) => {
    return (
        <div

            key={space.id}
            className={`${space.status === SpaceStatus.OCCUPIED
                    ? space.occupiedByvehicleType === VehicleType.CAR
                        ? 'bg-blue-200'
                        : space.occupiedByvehicleType === VehicleType.MOTORCYCLE
                            ? 'bg-green-200'
                            : 'bg-orange-200'
                    : 'bg-gray-200'
                } rounded-md p-2 text-center text-sm`}
        >
            <p className='bg-slate-50 font-mono font-thin rounded-md'>{space.spaceNumber}</p>
            {space.status === SpaceStatus.OCCUPIED && (
                <div className="text-slate-500 mt-1 w-full align-middle justify-content-center flex items-center gap-1 justify-center">
                    {space.occupiedByvehicleType === VehicleType.CAR && <CarFront size={24} className="text-blue-500" />}
                    {space.occupiedByvehicleType === VehicleType.MOTORCYCLE && <Motorbike size={24} className="text-green-800" />}
                    {space.occupiedByvehicleType === VehicleType.TRUCK && <Van size={24} className="text-orange-800" />}
                    {space.occupiedByvehicleType === undefined && <ParkingMeter size={24} className="text-slate-500" />}
                </div>
            )}
        </div>
    )
}

export default SpaceCard