
import { useEffect, useState } from 'react'

import ParkingPhoto from '../../../assets/logos/Parking-Logo.jpg'
import ParkingCard from '../components/ParkingCard'
import {
  MapPin,
  Clock3,
  CircleDot
} from 'lucide-react'
import type { NearbyParkingLot } from '../../../types/parking.types'

function ParkingListPage() {
  const [parkings, setParkings] = useState<NearbyParkingLot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [searchText, setSearchText] = useState('')
  

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const data: NearbyParkingLot[] = [
            {
              id: '1',
              name: 'Parking Centro',
              address: 'San Miguel de Tucumán',
              image: ParkingPhoto,
              latitude: -26.82,
              longitude: -65.20,
              distance: 350,
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
              latitude: -26.80,
              longitude: -65.30,
              distance: 1200,
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

          setParkings(data)
        } catch (err) {
          console.error(err)
          setError('No se pudieron cargar los estacionamientos')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Debés permitir acceso a tu ubicación')
        setLoading(false)
      }
    )
  }, [])

  if (loading) {
    return (
      <div className='p-6'>
        Cargando estacionamientos...
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-6 text-red-500'>
        {error}
      </div>
    )
  }

const filteredParkings = parkings.filter((parking) =>
  parking.name.toLowerCase().includes(searchText.toLowerCase()) ||
  parking.address.toLowerCase().includes(searchText.toLowerCase())
)




  return (
    <div className='min-h-screen bg-gray-100'>
      <main className='max-w-7xl mx-auto p-6 flex flex-col gap-6'>

        {/* Encabezado */}
        <div className='flex items-center gap-5 mb-4'>

  <div className='bg-blue-100 p-6 rounded-full'>
    <MapPin
      size={40}
      className='text-blue-600'
    />
  </div>

  <div>
    <h1 className='text-4xl font-bold'>
      Estacionar Ahora
    </h1>

    <p className='text-gray-500 text-lg'>
      Encontrá estacionamientos disponibles cerca tuyo
    </p>
  </div>

</div>

        {/* Buscador */}
        {/* Buscador */}
<div className='bg-white rounded-2xl shadow-sm p-5'>

  <label className='block text-sm text-gray-500 mb-3'>
    ¿Dónde querés estacionar?
  </label>

  <div className='flex gap-3'>

    <input
      type='text'
      placeholder='Ej: Yerba Buena, Centro, San Martín 450...'
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      className='flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
    />

    <button
      onClick={() => setShowMap(!showMap)}
      className='bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl'
    >
      {showMap ? 'Ocultar mapa' : 'Mostrar mapa'}
    </button>

  </div>

</div>

{/* Información */}
 

{/* Mapa */}
{showMap && (
  <div className='bg-white rounded-2xl shadow-md overflow-hidden'>
    <div className='bg-blue-600 text-white px-4 py-3 font-semibold'>
      Mapa de estacionamientos cercanos
    </div>

    <div className='h-96 flex items-center justify-center bg-gray-100'>
      <div className='text-center'>
        <div className='text-6xl mb-4'>🗺️</div>

        <h2 className='text-xl font-bold'>
          Vista de mapa
        </h2>

        <p className='text-gray-500 mt-2'>
          Aquí se mostrarán los pines de los estacionamientos.
        </p>
      </div>
    </div>
  </div>
)}

       
        <div className='grid lg:grid-cols-4 gap-6'>

          {/* Sidebar */}
          <aside className='flex flex-col gap-4'>

  {/* Cerca tuyo */}
  <div className='bg-white rounded-2xl shadow-sm p-5'>
    <div className='flex items-start gap-3'>

      <div className='bg-blue-100 p-3 rounded-full'>
        🎯
      </div>

      <div>
        <h3 className='font-semibold'>
          Cerca tuyo
        </h3>

        <p className='text-sm text-gray-500'>
          Opciones a pocos minutos de distancia.
        </p>
      </div>

    </div>
  </div>

  {/* Tiempo real */}
  <div className='bg-white rounded-2xl shadow-sm p-5'>
    <div className='flex items-start gap-3'>

      <div className='bg-green-100 p-3 rounded-full'>
        🕒
      </div>

      <div>
        <h3 className='font-semibold'>
          En tiempo real
        </h3>

        <p className='text-sm text-gray-500'>
          Disponibilidad actualizada al instante.
        </p>
      </div>

    </div>
  </div>

  {/* Reserva fácil */}
  <div className='bg-white rounded-2xl shadow-sm p-5'>
    <div className='flex items-start gap-3'>

      <div className='bg-purple-100 p-3 rounded-full'>
        🔒
      </div>

      <div>
        <h3 className='font-semibold'>
          Reserva fácil y rápida
        </h3>

        <p className='text-sm text-gray-500'>
          Asegurá tu lugar en pocos clics.
        </p>
      </div>

    </div>
  </div>

  {/* Banner */}
  <div className='bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl p-5'>

    <h3 className='font-bold text-lg'>
      Reservá tu lugar con anticipación
    </h3>

    <p className='text-sm mt-2'>
      Evitá vueltas y asegurá tu espacio cuando más lo necesitás.
    </p>

  </div>

</aside>

          {/* Tarjetas */}
         <section className='lg:col-span-3 flex flex-col gap-6'>

  {filteredParkings.map((parking, index) => (
    <ParkingCard
      key={parking.id}
      parking={parking}
      isClosest={index === 0}
    />
  ))}

  {filteredParkings.length === 0 && (
    <div className='bg-white rounded-2xl shadow-sm p-6 text-center text-gray-500'>
      No se encontraron estacionamientos para "{searchText}"
    </div>
  )}

</section>

        </div>

        {/* Footer */}
        <div className='bg-white rounded-2xl shadow-sm p-6 mt-4'>
          <div className='grid md:grid-cols-3 gap-6 text-center'>

            <div>
              <h4 className='font-semibold'>
                🛡️ Seguridad
              </h4>

              <p className='text-sm text-gray-500 mt-1'>
                Estacionamientos verificados y seguros.
              </p>
            </div>

            <div>
              <h4 className='font-semibold'>
                🎧 Soporte
              </h4>

              <p className='text-sm text-gray-500 mt-1'>
                Atención disponible las 24 horas.
              </p>
            </div>

            <div>
              <h4 className='font-semibold'>
                📱 App móvil
              </h4>

              <p className='text-sm text-gray-500 mt-1'>
                Reservá desde cualquier lugar.
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}

export default ParkingListPage