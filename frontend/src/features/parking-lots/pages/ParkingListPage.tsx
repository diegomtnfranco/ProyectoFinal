
import ParkingCard from '../components/ParkingCard'

import ParkingPhoto from '../../../assets/logos/Parking-Logo.jpg'

import type { ParkingLot } from '../types/parking.types'

const parkingLots: ParkingLot[] = [
  {
    id: '1',
    name: 'Parking Centro',
    address: 'San Miguel de Tucumán',
    image: ParkingPhoto,
    availableSpaces: 12,
    pricePerHour: 1500,
  },
  {
    id: '2',
    name: 'Parking Norte',
    address: 'Yerba Buena',
    image: ParkingPhoto,
    availableSpaces: 5,
    pricePerHour: 1800,
  },
]

function ParkingListPage() {
  return (
    <div className='min-h-screen bg-gray-100'>

      <main className='max-w-6xl mx-auto p-4 flex flex-col gap-6'>
        <div>
          <h1 className='text-3xl font-bold'>Estacionar Ahora</h1>

          <p className='text-gray-500'>
            Encontrá estacionamientos disponibles cerca tuyo
          </p>
        </div>

        <div className='flex flex-col gap-6'>
          {parkingLots.map((parking) => (
            <ParkingCard
              key={parking.id}
              parking={parking}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default ParkingListPage