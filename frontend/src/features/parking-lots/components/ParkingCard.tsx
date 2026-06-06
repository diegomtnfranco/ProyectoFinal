import { Link } from 'react-router-dom'
import type { NearbyParkingLot } from '../../../types/parking.types'
import {
  MapPin,
  Clock3,
  CircleDot,
  Star
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  parking: NearbyParkingLot
  isClosest?: boolean
}

function ParkingCard({ parking, isClosest = false }: Props) {
  const available = parking.availability.available
  const total = parking.availability.total

  const distanceText =
    parking.distance >= 1000
      ? `${(parking.distance / 1000).toFixed(1)} km`
      : `${parking.distance} m`

      const navigate = useNavigate()

  return (
    <div
  className='bg-white rounded-3xl shadow-md p-6'
>
      <div className='md:flex'>
        <div className='md:w-72 h-56'>
          <img
            src={parking.image}
            alt={parking.name}
            className='w-full h-full object-cover'
          />
        </div>

        <div className='flex-1 p-6 flex flex-col justify-between'>
          <div>
            {isClosest && (
              <span className='inline-block mb-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold'>
                <div className="flex items-center gap-2 text-yellow-600 font-semibold">
  <Star size={16} />
  Más cercano
</div>
              </span>
            )}

            <h2 className='text-2xl font-bold'>
              {parking.name}
            </h2>

            <p className='text-gray-500 mt-1'>
              {parking.address}
            </p>

            <div className='flex gap-4 mt-3 text-sm text-gray-600'>
              <span><div className="flex items-center gap-1">
  <MapPin size={14} />
  {distanceText}
</div></span>

              <span>
               <div className="flex items-center gap-1">
  <Clock3 size={14} />
  {parking.openTime} - {parking.closeTime}
</div>
              </span>
            </div>
          </div>

          <div className='mt-5 flex items-center justify-between'>
            <div>
              {available > 0 ? (
                <>
                  <span className='text-green-600 font-semibold'>
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
  <CircleDot size={16} />
  Disponible
</div>
                  </span>

                  <p className='text-gray-500'>
                    {available} de {total} lugares libres
                  </p>
                </>
              ) : (
                <span className='text-red-600 font-semibold'>
                  🔴 Completo
                </span>
              )}
            </div>

         <button
  disabled={available === 0}
  onClick={(e) => {
    e.preventDefault()

    if (available === 0) {
      alert('Este estacionamiento está completo')
      return
    }

    navigate(`/client/parking-lots/${parking.id}`)
  }}
  className={`px-5 py-2 rounded-xl text-white transition-all
    ${
      available > 0
        ? 'bg-blue-600 hover:bg-blue-700'
        : 'bg-gray-400 cursor-not-allowed'
    }`}
>
  {available > 0 ? 'Reservar' : 'Completo'}
</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParkingCard