import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import L, { type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix íconos leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type Position = [number, number]

interface ChangeMapViewProps {
  center: Position
}

function ChangeMapView({
  center,
}: ChangeMapViewProps) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, 16)
  }, [center, map])

  return null
}

interface LocationMarkerProps {
  position: Position | null
  setPosition: React.Dispatch<
    React.SetStateAction<Position | null>
  >
}

function LocationMarker({
  position,
  setPosition,
}: LocationMarkerProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  return position ? (
    <Marker position={position} />
  ) : null
}

function CompanyLocationForm() {
  const navigate = useNavigate()

  const [address, setAddress] = useState('')
  const [position, setPosition] =
    useState<Position | null>(null)

  const [loadingSearch, setLoadingSearch] =
    useState(false)

  const [error, setError] = useState('')

  const [showSuccessModal, setShowSuccessModal] =
    useState(false)

  // Buscar dirección con OpenStreetMap
  const searchAddress = async () => {
    if (!address.trim()) return

    try {
      setLoadingSearch(true)
      setError('')

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}`
      )

      if (!response.ok) {
        throw new Error('Error en la búsqueda')
      }

      const data = await response.json()

      if (data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)

        setPosition([lat, lon])
      } else {
        setError('No se encontró la dirección')
      }
    } catch (err) {
      console.error(err)

      setError(
        'Error al buscar la dirección'
      )
    } finally {
      setLoadingSearch(false)
    }
  }

  // Validación
  const isFormValid =
    address.trim() !== '' &&
    position !== null

  const handleFinish = async () => {
    if (!isFormValid || !position) {
      setError(
        'Debés ingresar una dirección válida y seleccionar una ubicación'
      )

      return
    }

    try {
      // Datos anteriores
      const previousData =
        localStorage.getItem('companyData')

      const companyData = previousData
        ? JSON.parse(previousData)
        : {}

      // Datos finales
      const finalCompanyData = {
        ...companyData,
        address,
        coordinates: {
          lat: position[0],
          lng: position[1],
        },
      }

      console.log(
        'Empresa creada:',
        finalCompanyData
      )

      // await createCompany(finalCompanyData)

      setShowSuccessModal(true)

      localStorage.removeItem(
        'companyData'
      )

      setTimeout(() => {
        navigate('/')
      }, 4000)
    } catch (err) {
      console.error(err)

      setError(
        'Ocurrió un error al crear la empresa'
      )
    }
  }

  const defaultCenter: LatLngExpression = [
    -26.8083,
    -65.2176,
  ]

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
      <div className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-2xl flex flex-col gap-6'>
        
        <div>
          <h1 className='text-3xl font-bold'>
            Ubicación del estacionamiento
          </h1>

          <p className='text-gray-500'>
            Ingresá la dirección física de tu estacionamiento
          </p>
        </div>

        {/* Dirección */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>
            Dirección física
          </label>

          <div className='flex gap-2'>
            <input
              type='text'
              value={address}
              onChange={(e) =>
                setAddress(e.target.value)
              }
              placeholder='Av. Siempre Viva 123'
              className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 flex-1'
            />

            <button
              type='button'
              onClick={searchAddress}
              disabled={
                !address.trim() ||
                loadingSearch
              }
              className={`px-5 rounded-xl text-white font-semibold transition-all ${
                address.trim()
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loadingSearch
                ? 'Buscando...'
                : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className='bg-red-100 text-red-600 p-3 rounded-xl'>
            {error}
          </div>
        )}

        {/* Mapa */}
        <div className='overflow-hidden rounded-2xl border border-gray-300 z-0'>
          <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom
            className='h-[450px] w-full'
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {position && (
              <ChangeMapView
                center={position}
              />
            )}

            <LocationMarker
              position={position}
              setPosition={setPosition}
            />
          </MapContainer>
        </div>

        {/* Ayuda */}
        <p className='text-sm text-gray-500'>
          También podés hacer click en el mapa
          para ajustar la ubicación exacta del
          estacionamiento.
        </p>

        {/* Finalizar */}
        <button
          type='button'
          onClick={handleFinish}
          disabled={!isFormValid}
          className={`text-white font-semibold py-3 rounded-xl transition-all ${
            isFormValid
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Finalizar y crear empresa
        </button>

        {/* Volver */}
        <button
          type='button'
          onClick={() =>
            navigate('/create-company')
          }
          className='text-gray-500 hover:text-gray-700'
        >
          Volver
        </button>
      </div>

      {/* Modal éxito */}
      {showSuccessModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]'>
          <div className='bg-white rounded-3xl p-8 max-w-md w-full mx-4 flex flex-col items-center text-center shadow-2xl animate-fade-in'>
            
            <CheckCircle
              size={90}
              className='text-green-500 mb-4'
            />

            <h2 className='text-3xl font-bold mb-2'>
              ¡Empresa creada!
            </h2>

            <p className='text-gray-600 text-lg'>
              La compañía fue creada correctamente.
            </p>

            <p className='text-gray-500 mt-2'>
              Te enviamos un correo de validación al email registrado.
            </p>

            <div className='mt-6 flex gap-2'>
              <div className='w-3 h-3 bg-green-500 rounded-full animate-bounce'></div>
              <div className='w-3 h-3 bg-green-500 rounded-full animate-bounce delay-100'></div>
              <div className='w-3 h-3 bg-green-500 rounded-full animate-bounce delay-200'></div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyLocationForm