
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  MapPin,
  Navigation,
  Search,
  RefreshCw,
} from 'lucide-react';

import { useParkingLotsStore } from '../../../stores/parkingStore';
import { useWebsocketStore } from '../../../stores/websocketStore';
import { useAuthStore } from '../../../stores/authStore';
import ParkingMapView from '../components/ParkingMapView';

function ParkingMapPage() {
  const navigate = useNavigate();

  const {
    nearbyParkings,
    isLoading,
    error,
    fetchNearby,
    clearError,
    updateParkingAvailability,
  } = useParkingLotsStore();

  const {
    isConnected,
    connect,
    subscribe,
    unsubscribe,
    joinRoom,
    leaveRoom,
  } = useWebsocketStore();

  const { token } = useAuthStore();

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [searchText, setSearchText] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingMyLocation, setIsUsingMyLocation] = useState(true);
  const [searchedAddress, setSearchedAddress] = useState('');

  const hasLoadedRef = useRef(false);
  const hasConnectedRef = useRef(false);
  const subscribedParkingsRef = useRef<Set<string>>(new Set());

  // Conectar el WebSocket cuando haya un token.
  useEffect(() => {
    if (token && !hasConnectedRef.current && !isConnected) {
      hasConnectedRef.current = true;
      connect(token);
    }
  }, [token, connect, isConnected]);

  // Obtener la ubicación del usuario.
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        setIsUsingMyLocation(true);
        setSearchedAddress('');
        setSearchText('');
        setIsLocating(false);
      },
      (geoError) => {
        let message = 'No se pudo obtener tu ubicación.';

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message =
              'Permiso de ubicación denegado. Permití el acceso a la ubicación desde tu navegador.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            message = 'La ubicación no está disponible en este momento.';
            break;
          case geoError.TIMEOUT:
            message = 'Se agotó el tiempo de espera al obtener tu ubicación.';
            break;
        }

        setLocationError(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, []);

  // Buscar una dirección y centrar el mapa en esa zona.
  const searchAddress = useCallback(async () => {
    if (!searchText.trim()) {
      setLocationError('Ingresá una dirección para buscar.');
      return;
    }

    setIsSearching(true);
    setLocationError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`,
      );

      if (!response.ok) {
        throw new Error('No se pudo completar la búsqueda.');
      }

      const results = await response.json();

      if (!results.length) {
        setLocationError('No se encontró esa dirección. Probá con otra.');
        return;
      }

      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);

      setUserLocation({ lat, lng });
      setSearchedAddress(results[0].display_name);
      setIsUsingMyLocation(false);
    } catch (searchError) {
      console.error('Error buscando dirección:', searchError);
      setLocationError('Ocurrió un error al buscar la dirección.');
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  // Cargar los estacionamientos cercanos a la ubicación actual.
  const loadNearbyParkings = useCallback(async () => {
    if (!userLocation) return;

    try {
      await fetchNearby(userLocation.lat, userLocation.lng, 5000);
    } catch (fetchError) {
      console.error('Error cargando estacionamientos:', fetchError);
    }
  }, [userLocation, fetchNearby]);

  // Obtener la ubicación al entrar por primera vez.
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      getUserLocation();
    }
  }, [getUserLocation]);

  // Actualizar los estacionamientos cuando cambia la ubicación.
  useEffect(() => {
    if (userLocation) {
      loadNearbyParkings();
    }
  }, [userLocation, loadNearbyParkings]);

  // Suscribirse a las actualizaciones en tiempo real.
  useEffect(() => {
    if (!isConnected || nearbyParkings.length === 0) return;

    nearbyParkings.forEach((parking) => {
      if (!subscribedParkingsRef.current.has(parking.id)) {
        joinRoom(parking.id);
        subscribedParkingsRef.current.add(parking.id);
      }
    });

    return () => {
      subscribedParkingsRef.current.forEach((parkingId) => {
        leaveRoom(parkingId);
      });

      subscribedParkingsRef.current.clear();
    };
  }, [isConnected, nearbyParkings, joinRoom, leaveRoom]);

  // Escuchar cambios de disponibilidad enviados por el servidor.
  useEffect(() => {
    if (!isConnected) return;

    const handleAvailability = (data: any) => {
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
      if (!data?.parkingLotId || !data?.action) return;

      const parking = nearbyParkings.find(
        (item) => item.id === data.parkingLotId,
      );

      if (!parking) return;

      const availability = { ...parking.availability };

      if (data.action === 'check-in') {
        availability.available = Math.max(0, availability.available - 1);
        availability.occupied += 1;
      } else if (data.action === 'check-out') {
        availability.available = Math.min(
          availability.total,
          availability.available + 1,
        );
        availability.occupied = Math.max(0, availability.occupied - 1);
      }

      updateParkingAvailability(data.parkingLotId, availability);
    };

    subscribe('parking:availability', handleAvailability);
    subscribe('occupancy:update', handleOccupancyUpdate);

    return () => {
      unsubscribe('parking:availability', handleAvailability);
      unsubscribe('occupancy:update', handleOccupancyUpdate);
    };
  }, [
    isConnected,
    nearbyParkings,
    subscribe,
    unsubscribe,
    updateParkingAvailability,
  ]);

  const handleRetry = () => {
    clearError();
    setLocationError(null);
    getUserLocation();
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      void searchAddress();
    }
  };

  if ((isLoading && nearbyParkings.length === 0) || (isLocating && !userLocation)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 animate-spin text-blue-600" size={40} />
          <p className="font-medium text-gray-700">Preparando el mapa...</p>
          <p className="mt-1 text-sm text-gray-500">
            Estamos buscando estacionamientos cercanos.
          </p>
        </div>
      </div>
    );
  }

  if (locationError || error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            No pudimos cargar el mapa
          </h1>
          <p className="mb-6 text-gray-600">
            {locationError || error}
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw size={18} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="text-blue-600" size={26} />
            <h1 className="text-2xl font-bold text-gray-900">
              Mapa de estacionamientos
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Explorá el mapa y seleccioná un estacionamiento para ver sus detalles.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-green-500' : 'animate-pulse bg-yellow-500'
            }`}
          />
          <span className="text-gray-600">
            {isConnected ? 'Actualización en tiempo real' : 'Conectando...'}
          </span>
        </div>
      </header>

      <section className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
        <label
          htmlFor="map-address-search"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Buscar una zona o dirección
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              id="map-address-search"
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Ej.: Plaza Independencia, Tucumán"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={() => void searchAddress()}
              disabled={isSearching}
              title="Buscar dirección"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Search size={20} />
              )}
            </button>
          </div>

          {!isUsingMyLocation && (
            <button
              onClick={getUserLocation}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Navigation size={18} />
              Mi ubicación
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="min-w-0 break-words text-gray-500">
            {isUsingMyLocation
              ? 'Buscando estacionamientos cerca de tu ubicación.'
              : `Zona seleccionada: ${searchedAddress || searchText}`}
          </p>

          <span className="font-medium text-gray-700">
            {nearbyParkings.length} estacionamientos encontrados
          </span>
        </div>
      </section>

      <section className="relative z-0 h-[calc(100dvh-300px)] min-h-[420px] overflow-hidden rounded-2xl bg-white shadow-md">
        {userLocation ? (
          <ParkingMapView
            parkings={nearbyParkings}
            center={userLocation}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Esperando la ubicación...
          </div>
        )}
      </section>

      {nearbyParkings.length === 0 && !isLoading && (
        <div className="rounded-xl bg-white p-4 text-center text-sm text-gray-600 shadow-sm">
          No encontramos estacionamientos en esta zona. Probá buscar otra dirección.
        </div>
      )}

      <button
        onClick={() => navigate('/client')}
        className="self-start text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        Volver a Estacionamientos
      </button>
    </div>
  );
}

export default ParkingMapPage;
