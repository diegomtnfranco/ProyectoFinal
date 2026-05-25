import SpaceCard from "./SpaceCard"
import type { Space } from "../../../types/parking.types"



const ParkingMap = ({ spacesList }: { spacesList: Space[] }) => {
  return (
      <div className="rounded-md w-4/6 box-border flex border-2  bg-white p-6 shadow-sm min-h-[350px]">
        {
          (spacesList.length > 0) ? (
            
            <div className="w-full grid md:grid-cols-10 grid-cols-3 gap-4 auto-rows-max">
              {spacesList.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No hay espacios disponibles.</p>
          )
        }

      </div>
  )
}

export default ParkingMap