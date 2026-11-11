import type { ParkingLotNearbyResponseDto } from '../../../types/parking.types';
import { MapPin, Clock3, CircleDot, Star, Navigation, Car,  Truck, Van, Motorbike } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';

interface Props {
  parking: ParkingLotNearbyResponseDto;
  isClosest?: boolean;
}

// Mapeo de tipos de vehículo a íconos y etiquetas
// NOTA: Los valores deben coincidir EXACTAMENTE con los que envía el backend
const vehicleTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  'car': { icon: <Car size={14} />, label: 'Auto', color: 'text-blue-600' },
  'CAR': { icon: <Car size={14} />, label: 'Auto', color: 'text-blue-600' },
  'motorcycle': { icon: <Motorbike size={14} />, label: 'Moto', color: 'text-green-600' },
  'MOTORCYCLE': { icon: <Motorbike size={14} />, label: 'Moto', color: 'text-green-600' },
  'van': { icon: <Truck size={14} />, label: 'Camioneta', color: 'text-orange-600' },
  'VAN': { icon: <Truck size={14} />, label: 'Camioneta', color: 'text-orange-600' },
  'truck': { icon: <Van size={14} />, label: 'Camioneta', color: 'text-purple-600' },
  'TRUCK': { icon: <Van size={14} />, label: 'Camioneta', color: 'text-purple-600' },
};

// Función para obtener la configuración del vehículo (case-insensitive)
const getVehicleConfig = (vehicleType: string) => {
  const lowerType = vehicleType?.toLowerCase() || 'car';
  if (lowerType === 'car') return vehicleTypeConfig['car'];
  if (lowerType === 'motorcycle') return vehicleTypeConfig['motorcycle'];
  if (lowerType === 'van') return vehicleTypeConfig['van'];
  if (lowerType === 'truck') return vehicleTypeConfig['van'];
  return vehicleTypeConfig['car']; // default
};

function ParkingCard({ parking, isClosest = false }: Props) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const goToDetails = () => navigate(`/client/parking-lots/${parking.id}`);
  // Tipo de vehículo del cliente (Perfil > Vehículos). Si no hay, se muestran todas las tarifas
  const clientVehicleType = user?.role === 'client' ? user?.clientProfile?.defaultVehicleType : undefined;
  const available = parking.availability.available;
  const total = parking.availability.total;
  const occupancyPercentage = total > 0 ? ((total - available) / total) * 100 : 0;

  const distanceText =
    parking.distance >= 1000
      ? `${(parking.distance / 1000).toFixed(1)} km`
      : `${Math.round(parking.distance)} m`;

  const getOccupancyColor = () => {
    if (occupancyPercentage < 50) return 'text-green-600';
    if (occupancyPercentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Formatear tarifas para mostrar (TODAS)
  const getRateDisplay = () => {
    if (!parking.rates || parking.rates.length === 0) {
      return (
        <div className="flex items-center gap-1 text-gray-400 text-xs mt-2">
          <span>Consultar tarifas</span>
        </div>
      );
    }
    
    // Solo las tarifas del vehículo del cliente (si ninguna coincide, se muestran todas)
    const matchingRates = clientVehicleType
      ? parking.rates.filter((r) => r.vehicleType?.toLowerCase() === String(clientVehicleType).toLowerCase())
      : [];
    const ratesToShow = matchingRates.length > 0 ? matchingRates : parking.rates;

    return (
      <div className="mt-2">
        <div className="flex flex-wrap gap-2">
          {ratesToShow.map((rate) => {
            const config = getVehicleConfig(rate.vehicleType);
            return (
              <div
                key={rate.id}
                className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full text-xs"
              >
                <span className={config.color}>{config.icon}</span>
                <span className="text-gray-700">{config.label}</span>
                <span className="font-semibold text-gray-900">${rate.price}/h</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={() => {
        // En celular toda la tarjeta es el acceso a "Ver más"
        if (window.matchMedia('(max-width: 767px)').matches) goToDetails();
      }}
      className='bg-white rounded-3xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer md:cursor-default'
    >
      <div className='md:flex'>
        {/* Imagen placeholder */}
        <div className='md:w-72 h-56 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center'>
          {parking.imageUrl ? <img src={parking.imageUrl} alt={parking.name} className='w-full h-full object-cover' /> : <Car size={48} className='text-gray-300' />}
        </div>

        <div className='flex-1 p-6 flex flex-col justify-between'>
          <div>
            {isClosest && (
              <span className='inline-block mb-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold'>
                <div className='flex items-center gap-2'>
                  <Star size={16} />
                  Más cercano
                </div>
              </span>
            )}

            <h2 className='text-2xl font-bold'>{parking.name}</h2>
            <p className='text-gray-500 mt-1'>{parking.address}</p>

            <div className='flex flex-wrap gap-4 mt-3 text-sm text-gray-600'>
              <span className='flex items-center gap-1'>
                <Navigation size={14} />
                {distanceText}
              </span>
              <span className='flex items-center gap-1'>
                <Clock3 size={14} />
                {parking.openTime} - {parking.closeTime}
              </span>
            </div>
            
            {/* Mostrar todas las tarifas */}
            {getRateDisplay()}
          </div>

          <div className='mt-5 flex items-center justify-between flex-wrap gap-3'>
            <div>
              {available > 0 ? (
                <span className={`flex items-center gap-2 text-sm font-semibold ${getOccupancyColor()}`}>
                  <CircleDot size={16} />
                  {available} de {total} lugares libres
                </span>
              ) : (
                <span className='text-red-600 text-sm font-semibold flex items-center gap-2'>
                  <CircleDot size={16} />
                  Completo
                </span>
              )}
            </div>

            {/* Solo en PC: en celular toda la tarjeta es clickeable */}
            <div className='hidden md:flex gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToDetails();
                }}
                className='px-5 py-2 rounded-xl text-white transition-all bg-blue-600 hover:bg-blue-700'
              >
                Ver más
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParkingCard;