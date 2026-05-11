import { Link } from 'react-router-dom'

import type { ParkingLot } from '../types/parking.types'

interface Props {
  parking: ParkingLot
}

function ParkingCard({ parking }: Props) {
  return (
    <Link
      to={`/client/parking-lots/${parking.id}`}
      className='bg-white rounded-3xl shadow-md overflow-hidden flex flex-col md:flex-row hover:scale-[1.01] transition-all'
    >
      <div className='w-full md:w-72 h-52'>
        <img
          src={parking.image}
          alt={parking.name}
          className='w-full h-full object-cover'
        />
      </div>

      <div className='flex-1 flex justify-between items-center p-6'>
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-bold'>{parking.name}</h2>

          <p className='text-gray-500'>{parking.address}</p>

          <span className='text-green-600 font-semibold'>
            {parking.availableSpaces} espacios disponibles
          </span>
        </div>

        <div className='text-right'>
          <h3 className='text-2xl font-bold text-blue-600'>
            ${parking.pricePerHour}
          </h3>

          <span className='text-gray-500'>por hora</span>
        </div>
      </div>
    </Link>
  )
}

export default ParkingCard