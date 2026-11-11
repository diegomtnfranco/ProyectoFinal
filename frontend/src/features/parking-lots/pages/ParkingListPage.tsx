// frontend/src/features/parking-lots/pages/ParkingListPage.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParkingLotsStore } from '../../../stores/parkingStore';
import { useWebsocketStore } from '../../../stores/websocketStore';
import { useAuthStore } from '../../../stores/authStore';
import ParkingCard from '../components/ParkingCard';
import {
  Navigation,
  Search,
  Map as MapIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import ParkingMapView from '../components/ParkingMapView';

function ParkingListPage() {
  const { nearbyParkings, isLoading, error, fetchNearby, clearError, updateParkingAvailability } = useParkingLotsStore();
  const { isConnected, connect, subscribe, unsubscribe, joinRoom, leaveRoom } = useWebsocketStore();
  const { token } = useAuthStore();

  // ✅ Separar estados de búsqueda y filtro
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingMyLocation, setIsUsingMyLocation] = useState(true);

  const hasLoadedRef = useRef(false);
  const wsHandlersRef = useRef<{ [key: string]: (data: any) => void }>({});
  const hasConnectedRef = useRef(false);
  const subscribedParkingsRef = useRef<Set<string>>(new Set());

  // Conectar WebSocket cuando haya token
  useEffect(() => {
    if (token && !hasConnectedRef.current && !isConnected) {
      hasConnectedRef.current = true;
      connect(token);
    }
  }, [token, connect, isConnected]);

  // Obtener ubicación del usuario
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);
        setIsUsingMyLocation(true);
        setSearchLocation(null);
        setSearchText('');
        setFilterText(''); // ✅ Limpiar filtro también
      },
      (error) => {
        let errorMsg = 'Error al obtener tu ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Permiso denegado. Activá la ubicación para ver parkings cerca tuyo.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'No se pudo obtener tu ubicación';
            break;
          case error.TIMEOUT:
            errorMsg = 'Tiempo de espera agotado';
            break;
        }
        setLocationError(errorMsg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Buscar dirección con OpenStreetMap
  const searchAddress = useCallback(async () => {
    if (!searchText.trim()) {
      setLocationError('Ingresá una dirección para buscar');
      return;
    }

    setIsSearching(true);
    setLocationError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`
      );

      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }

      const data = await response.json();

      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const address = data[0].display_name;

        setSearchLocation({ lat, lng: lon, address });
        setUserLocation({ lat, lng: lon });
        setIsUsingMyLocation(false);
        setFilterText(''); // ✅ Limpiar filtro al buscar nueva ubicación
      } else {
        setLocationError('No se encontró la dirección. Intentá con términos más precisos.');
      }
    } catch (err) {
      console.error(err);
      setLocationError('Error al buscar la dirección');
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  // Cargar parkings según la ubicación actual
  const loadNearbyParkings = useCallback(async () => {
    if (!userLocation) return;

    try {
      await fetchNearby(userLocation.lat, userLocation.lng, 5000);
    } catch (err) {
      console.error('Error cargando parkings:', err);
    }
  }, [userLocation, fetchNearby]);

  // Volver a mi ubicación
  const backToMyLocation = () => {
    getUserLocation();
  };

  // Suscribirse a WebSockets para los parkings cargados
  useEffect(() => {
    if (!isConnected || nearbyParkings.length === 0) return;

    nearbyParkings.forEach(parking => {
      if (!subscribedParkingsRef.current.has(parking.id)) {
        joinRoom(parking.id);
        subscribedParkingsRef.current.add(parking.id);
      }
    });

    return () => {
      if (subscribedParkingsRef.current.size > 0) {
        subscribedParkingsRef.current.forEach(parkingId => {
          leaveRoom(parkingId);
        });
        subscribedParkingsRef.current.clear();
      }
    };
  }, [isConnected, nearbyParkings, joinRoom, leaveRoom]);

  // Carga inicial
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      getUserLocation();
    }
  }, [getUserLocation]);

  // Cargar cuando tengamos ubicación
  useEffect(() => {
    if (userLocation) {
      loadNearbyParkings();
    }
  }, [userLocation, loadNearbyParkings]);

  // WebSockets - Handlers para eventos
  useEffect(() => {
    if (!isConnected) return;

    const handleParkingAvailability = (data: any) => {
      if (data?.parkingLotId && data?.availableSpaces !== undefined) {
        updateParkingAvailability(data.parkingLotId, {
          total: data.totalSpaces,
          available: data.availableSpaces,
          occupied: data.occupiedSpaces,
          reserved: data.reservedSpaces,
        });
      }
    };

    const handleOccupancyUpdate = (data: any) => {
      if (data?.parkingLotId && data?.action) {
        const parking = nearbyParkings.find(p => p.id === data.parkingLotId);
        if (parking) {
          const newAvailability = { ...parking.availability };

          if (data.action === 'check-in') {
            newAvailability.available = Math.max(0, newAvailability.available - 1);
            newAvailability.occupied = newAvailability.occupied + 1;
          } else if (data.action === 'check-out') {
            newAvailability.available = Math.min(newAvailability.total, newAvailability.available + 1);
            newAvailability.occupied = Math.max(0, newAvailability.occupied - 1);
          }

          updateParkingAvailability(data.parkingLotId, newAvailability);
        }
      }
    };

    wsHandlersRef.current = {
      'parking:availability': handleParkingAvailability,
      'occupancy:update': handleOccupancyUpdate,
    };

    Object.entries(wsHandlersRef.current).forEach(([event, handler]) => {
      subscribe(event, handler);
    });

    return () => {
      Object.entries(wsHandlersRef.current).forEach(([event, handler]) => {
        unsubscribe(event, handler);
      });
      wsHandlersRef.current = {};
    };
  }, [isConnected, subscribe, unsubscribe, updateParkingAvailability, nearbyParkings]);

  // ✅ Manejar búsqueda
  const handleSearch = () => {
    if (searchText.trim()) {
      searchAddress();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // ✅ Filtrar por texto (usando filterText)
  const filteredParkings = nearbyParkings.filter(
    (parking) =>
      parking.name.toLowerCase().includes(filterText.toLowerCase()) ||
      parking.address.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleRetry = () => {
    clearError();
    setLocationError(null);
    hasLoadedRef.current = false;
    getUserLocation();
  };

  // Estados de carga
  if ((isLoading && nearbyParkings.length === 0) || (isLocating && !userLocation)) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Obteniendo tu ubicación...</p>
        </div>
      </div>
    );
  }

  if (locationError || error) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
        <div className='bg-white rounded-3xl shadow-xl p-8 max-w-md text-center'>
          <AlertCircle size={64} className='text-red-500 mx-auto mb-4' />
          <h2 className='text-2xl font-bold mb-2'>Error</h2>
          <p className='text-gray-600 mb-6'>{locationError || error}</p>
          <button
            onClick={handleRetry}
            className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all'
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      <main className='max-w-7xl mx-auto p-6 flex flex-col gap-6'>
        {/* Buscador */}
        <div className='bg-white rounded-2xl shadow-sm p-5'>
          <label className='block text-sm text-gray-500 mb-3'>¿Dónde querés estacionar?</label>
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='flex-1 relative'>
              <input
                type='text'
                placeholder='Ej: Yerba Buena, Centro, San Martín 450...'
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                className='w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className='absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50'
                title='Buscar dirección'
              >
                {isSearching ? <Loader2 size={20} className='animate-spin' /> : <Search size={20} />}
              </button>
            </div>
            <div className='flex gap-2'>
              {!isUsingMyLocation && (
                <button
                  onClick={backToMyLocation}
                  className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-all flex items-center gap-2 text-sm'
                  title='Volver a mi ubicación'
                >
                  <Navigation size={18} />
                  Mi ubicación
                </button>
              )}
              <button
                onClick={() => setShowMap(!showMap)}
                className='bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl transition-all flex items-center gap-2'
                title={showMap ? 'Ocultar mapa' : 'Mostrar mapa'}
              >
                <MapIcon size={20} />
                {showMap ? 'Ocultar' : 'Ver mapa'}
              </button>
            </div>
          </div>
        </div>

        {/* Mapa */}
        {showMap ? (
          <div className='bg-white rounded-2xl shadow-md overflow-hidden'>
            <div className='bg-blue-600 text-white px-4 py-3 font-semibold flex items-center gap-2'>
              <MapIcon size={18} />
              Mapa de estacionamientos cercanos
            </div>
            <div className='h-96 w-full'>
              <ParkingMapView
                parkings={filteredParkings}
                center={userLocation || { lat: -26.8083, lng: -65.2176 }}
              />
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            <section className="lg:col-span-4 flex flex-col gap-6">
              {filteredParkings.length === 0 && !isLoading ? (
                <div className='bg-white rounded-2xl shadow-sm p-6 text-center text-gray-500'>
                  <p>No se encontraron estacionamientos para tu búsqueda</p>
                  <button
                    onClick={backToMyLocation}
                    className='mt-4 text-blue-600 hover:text-blue-700 font-semibold'
                  >
                    Ver estacionamientos cerca de mí
                  </button>
                </div>
              ) : (
                filteredParkings.map((parking, index) => (
                  <ParkingCard
                    key={parking.id}
                    parking={parking}
                    isClosest={index === 0 && filteredParkings.length > 1}
                  />
                ))
              )}
            </section>
          </div>
        )}

        {/* Footer */}
        <div className='bg-white rounded-2xl shadow-sm p-6 mt-4'>
          <div className='grid md:grid-cols-3 gap-6 text-center'>
            <div><h4 className='font-semibold'>Seguridad</h4><p className='text-sm text-gray-500'>Estacionamientos verificados</p></div>
            <div><h4 className='font-semibold'>Soporte</h4><p className='text-sm text-gray-500'>Atención 24 horas</p></div>
            <div><h4 className='font-semibold'>App móvil</h4><p className='text-sm text-gray-500'>Reservá desde cualquier lugar</p></div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ParkingListPage;