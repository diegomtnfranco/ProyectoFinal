import ParkingPhoto from '../../../assets/images/Parking-Photo.jpg'
import {
  MapPin,
  Clock3,
  CircleDot,
  Car
} from 'lucide-react'
import { useState } from 'react'
import { reservationsService } from '../../../services/reservations.service'
import { useParams } from 'react-router-dom'



function ParkingDetailsPage() {

  const { id } = useParams()


  // ============================================
  // ESTADOS DEL FORMULARIO
  // ============================================

  const [vehicleType, setVehicleType] = useState('car')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  // ============================================
  // CÁLCULO DE HORAS Y PRECIO
  // ============================================

 const totalHours =
  startTime &&
  endTime &&
  new Date(endTime) > new Date(startTime)
    ? Math.ceil(
        (
          new Date(endTime).getTime() -
          new Date(startTime).getTime()
        ) / (1000 * 60 * 60)
      )
    : 0


const mockParkings = [
  {
    id: '1',
    name: 'Parking Centro',
    address: 'San Miguel de Tucumán',
    image: ParkingPhoto,
    latitude: -26.828954,
    longitude: -65.204266,
    distance: 1200,
    openTime: '08:00',
    closeTime: '22:00',
    availability: {
      total: 50,
      available: 15,
      occupied: 30,
      reserved: 5,
    },
  },

  {
    id: '2',
    name: 'Parking Norte',
    address: 'Yerba Buena',
    image: ParkingPhoto,
    latitude: -26.800000,
    longitude: -65.300000,
    distance: 2500,
    openTime: '07:00',
    closeTime: '23:00',
    availability: {
      total: 40,
      available: 0,
      occupied: 38,
      reserved: 2,
    },
  },
]

const parking = mockParkings.find(
  parking => parking.id === id
)


if (!parking) {
  return (
    <div className='p-6'>
      Estacionamiento no encontrado
    </div>
  )
}

  // ============================================
  // PRECIO MOCK
  // Luego vendrá desde Rates del backend
  // ============================================

  const pricePerHour = 1500

  const totalPrice = totalHours * pricePerHour

  // ============================================
  // CREAR RESERVA
  // ============================================

 const handleReserve = async () => {

  // Verificar disponibilidad
  if (parking.availability.available === 0) {
    alert('Este estacionamiento no tiene lugares disponibles')
    return
  }

  // Verificar campos obligatorios
  if (!vehiclePlate || !startTime || !endTime) {
    alert('Completá todos los campos')
    return
  }

  if (new Date(endTime) <= new Date(startTime)) {
  alert('La fecha de fin debe ser posterior a la de inicio')
  return
}

  try {

    const reservation = await reservationsService.create({
      parkingLotId: parking.id,
      vehicleType,
      vehiclePlate,
      startTime,
      endTime,
    })

    console.log('Reserva creada:', reservation)

    alert('Reserva creada correctamente')

  } catch (error) {

    console.error(error)

    alert(String(error))

  }
}

  return (
    <div className='min-h-screen bg-gray-100'>

      <main className='max-w-6xl mx-auto p-4'>

        <div className='bg-white rounded-3xl shadow-md overflow-hidden'>

          {/* FOTO DEL ESTACIONAMIENTO */}

          <img
            src={parking.image}
            alt={parking.name}
            className='w-full h-80 object-cover'
          />

          <div className='p-8 flex flex-col gap-6'>

            {/* NOMBRE Y DIRECCIÓN */}

            <div>

              <h1 className='text-4xl font-bold'>
                {parking.name}
              </h1>

              <p className='text-gray-500 mt-2'>
                {parking.address}
              </p>

            </div>

            {/* INFORMACIÓN GENERAL */}

            <div className='flex flex-wrap gap-4'>

              {/* DISPONIBILIDAD */}

              <div className='bg-green-100 text-green-700 px-4 py-2 rounded-xl flex items-center gap-2'>
                <CircleDot size={18} />
                {parking.availability.available} lugares disponibles
              </div>

              {/* HORARIO */}

              <div className='bg-blue-100 text-blue-700 px-4 py-2 rounded-xl flex items-center gap-2'>
                <Clock3 size={18} />
                {parking.openTime} - {parking.closeTime}
              </div>

              {/* DISTANCIA Y MAPA */}

              <div className='flex items-center gap-3'>

                <div className='bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl flex items-center gap-2'>
                  <MapPin size={18} />
                  {(parking.distance / 1000).toFixed(1)} km
                </div>

                <button
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}`,
                      '_blank'
                    )
                  }
                  className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl'
                >
                  Cómo llegar
                </button>

              </div>

            </div>

            <hr />

            {/* TARIFA */}

            <div className='bg-blue-50 rounded-2xl p-6'>

              <p className='text-gray-500'>
                Tarifa actual
              </p>

              <h2 className='text-3xl font-bold text-blue-600'>
                ${pricePerHour} / hora
              </h2>

            </div>

            {/* RESUMEN DEL COSTO */}

            {totalHours > 0 && (
              <div className='bg-green-50 border border-green-200 rounded-2xl p-4'>

                <h3 className='font-bold text-lg'>
                  Resumen de la reserva
                </h3>

                <p>
                  Horas: {totalHours}
                </p>

                <p className='font-semibold text-green-700'>
                  Total estimado: ${totalPrice}
                </p>

              </div>
            )}

            {/* FORMULARIO */}

{parking.availability.available === 0 && (
  <div className='bg-red-100 border border-red-300 text-red-700 p-4 rounded-xl'>
    Este estacionamiento se encuentra completo actualmente.
  </div>
)}

            <h2 className='text-2xl font-bold'>
              Reservar espacio
            </h2>

            <div className='grid md:grid-cols-2 gap-4'>

              {/* TIPO DE VEHÍCULO */}

              <div>

                <label className='flex items-center gap-2 mb-2 font-medium'>
                  <Car size={18} />
                  Tipo de vehículo
                </label>

                <select
                  className='w-full border rounded-xl p-3'
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value='car'>Auto</option>
                  <option value='motorcycle'>Moto</option>
                  <option value='van'>Camioneta</option>
                  <option value='truck'>Camión</option>
                </select>

              </div>

              {/* PATENTE */}

              <div>

                <label className='block mb-2 font-medium'>
                  Patente
                </label>

                <input
                  type='text'
                  placeholder='ABC123'
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className='w-full border rounded-xl p-3'
                />

              </div>

              {/* FECHA INICIO */}

              <div>

                <label className='block mb-2 font-medium'>
                  Fecha y hora de inicio
                </label>

                <input
                  type='datetime-local'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='w-full border rounded-xl p-3'
                />

              </div>

              {/* FECHA FIN */}

              <div>

                <label className='block mb-2 font-medium'>
                  Fecha y hora de fin
                </label>

                <input
                  type='datetime-local'
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className='w-full border rounded-xl p-3'
                />

              </div>

            </div>

            {/* BOTÓN RESERVAR */}

            <button
  onClick={handleReserve}
  disabled={parking.availability.available === 0}
  className={`py-4 rounded-xl font-semibold transition-all text-white
    ${
      parking.availability.available > 0
        ? 'bg-blue-600 hover:bg-blue-700'
        : 'bg-gray-400 cursor-not-allowed'
    }`}
>
  {parking.availability.available > 0
    ? 'Reservar espacio'
    : 'Sin disponibilidad'}
</button>

          </div>

        </div>

      </main>

    </div>
  )
}

export default ParkingDetailsPage