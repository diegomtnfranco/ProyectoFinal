

import ParkingCard from '../components/ParkingCard'
import ParkingAvailability from '../components/ParkingAvailability'
import ReservationBar from '../components/ReservationBar'

import ParkingPhoto from '../../../assets/images/Parking-Photo.jpg'

function ParkingDetailsPage() {
  const parking = {
    id: '1',
    name: 'Parking Centro',
    address: 'San Miguel de Tucumán',
    image: ParkingPhoto,
    availableSpaces: 12,
    pricePerHour: 1500,
  }

  return (
    <div className='min-h-screen bg-gray-100 pb-28'>

      <main className='max-w-6xl mx-auto p-4 flex flex-col gap-8'>
        <ParkingCard parking={parking} />

        <section className='flex flex-wrap gap-6'>
          <ParkingAvailability
            type='Autos'
            available={10}
          />

          <ParkingAvailability
            type='Motos'
            available={2}
          />

          <ParkingAvailability
            type='Camionetas'
            available={1}
          />
        </section>
      </main>

      <ReservationBar />
    </div>
  )
}

export default ParkingDetailsPage