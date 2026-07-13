// frontend/src/shared/components/map/ParkingMapView.tsx
import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ParkingLotNearbyResponseDto } from '../../../types/parking.types';
import { Motorbike, Van, Car } from 'lucide-react';

// Ícono personalizado para los markers
const createCustomIcon = (isAvailable: boolean, isClosest: boolean = false) => {
  const color = isAvailable ? '#22c55e' : '#ef4444';
  const size = isClosest ? 40 : 32;
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        font-size: ${size * 0.5}px;
        font-weight: bold;
        color: white;
      ">
        🅿️
      </div>
    `,
    className: 'custom-marker',
    iconSize: [size, size],
    popupAnchor: [0, -size / 2],
  });
};

// Mapeo de tipos de vehículo a íconos y etiquetas
const vehicleTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  car: { icon: <Car size={14} />, label: 'Auto', color: 'text-blue-600' },
  motorcycle: { icon: <Motorbike size={14} />, label: 'Moto', color: 'text-green-600' },
  van: { icon: <Van size={14} />, label: 'Van', color: 'text-orange-600' },
  truck: { icon: <Van size={14} />, label: 'Camioneta', color: 'text-orange-600' },
};

// Componente para centrar el mapa
function MapController({ center, zoom = 14 }: { center: { lat: number; lng: number }; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

// Componente para el marker con hover
interface ParkingMarkerProps {
  parking: ParkingLotNearbyResponseDto;
  isClosest?: boolean;
  onHover: (parking: ParkingLotNearbyResponseDto | null, position?: { x: number; y: number }) => void;
}

function ParkingMarker({ parking, isClosest, onHover }: ParkingMarkerProps) {
  const available = parking.availability.available > 0;
  const position: [number, number] = [parking.latitude, parking.longitude];
  const markerRef = useRef<L.Marker>(null);
  
  // Formatear tarifas para mostrar (TODAS)
  const getRateDisplay = () => {
    if (!parking.rates || parking.rates.length === 0) {
      return (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">Consultar tarifas</p>
        </div>
      );
    }
    
    return (
      <div className="mt-2">
        <p className="text-xs font-semibold text-gray-700 mb-1">Tarifas por hora:</p>
        <div className="space-y-1">
          {parking.rates.map((rate) => {
            const config = vehicleTypeConfig[rate.vehicleType] || vehicleTypeConfig.car;
            return (
              <div key={rate.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={config.color}>{config.icon}</span>
                  <span className="text-gray-600">{config.label}</span>
                </div>
                <span className="font-semibold text-gray-800">${rate.price}/h</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  const handleMouseEnter = () => {
    if (markerRef.current) {
      const markerElement = markerRef.current.getElement();
      if (markerElement) {
        const rect = markerElement.getBoundingClientRect();
        onHover(parking, { x: rect.left, y: rect.top });
      }
    }
  };

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={createCustomIcon(available, isClosest)}
      eventHandlers={{
        mouseover: handleMouseEnter,
        mouseout: () => onHover(null),
      }}
    >
      <Popup>
        <div className="p-2 min-w-[200px] max-w-[260px]">
          <h3 className="font-bold text-base">{parking.name}</h3>
          <p className="text-xs text-gray-600 break-words">{parking.address}</p>
          
          <div className="mt-2 flex justify-between items-center">
            <span className={`text-xs font-semibold ${available ? 'text-green-600' : 'text-red-600'}`}>
              {parking.availability.available} lugares disponibles
            </span>
            <span className="text-xs text-gray-500">
              {parking.distance >= 1000 
                ? `${(parking.distance / 1000).toFixed(1)} km`
                : `${Math.round(parking.distance)} m`}
            </span>
          </div>
          
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span>🕒 {parking.openTime} - {parking.closeTime}</span>
          </div>
          
          {getRateDisplay()}
          
          <button
            onClick={() => window.location.href = `/client/parking-lots/${parking.id}`}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded-lg transition-colors"
          >
            Ver detalles
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

// Componente principal del mapa
interface ParkingMapViewProps {
  parkings: ParkingLotNearbyResponseDto[];
  center: { lat: number; lng: number };
  onParkingHover?: (parking: ParkingLotNearbyResponseDto | null) => void;
}

function ParkingMapView({ parkings, center, onParkingHover }: ParkingMapViewProps) {
  const [hoveredParking, setHoveredParking] = useState<ParkingLotNearbyResponseDto | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleHover = (parking: ParkingLotNearbyResponseDto | null, position?: { x: number; y: number }) => {
    setHoveredParking(parking);
    if (position) {
      setTooltipPosition(position);
    }
    if (onParkingHover) onParkingHover(parking);
  };

  // Encontrar el parking más cercano
  const closestParking = parkings.length > 0 
    ? parkings.reduce((prev, curr) => 
        (curr.distance < prev.distance ? curr : prev)
      )
    : null;

  // Formatear tarifas para el tooltip hover (resumido)
  const getRateSummary = (rates: ParkingLotNearbyResponseDto['rates']) => {
    if (!rates || rates.length === 0) return 'Consultar tarifas';
    const firstRate = rates[0];
    const config = vehicleTypeConfig[firstRate.vehicleType] || vehicleTypeConfig.car;
    return `${config.label}: $${firstRate.price}/h`;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        ref={mapRef as any}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} zoom={14} />
        
        {/* Círculo de radio de búsqueda */}
        <Circle
          center={[center.lat, center.lng]}
          radius={5000}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05 }}
        />
        
        {/* Marcadores de parkings */}
        {parkings.map((parking) => (
          <ParkingMarker
            key={parking.id}
            parking={parking}
            isClosest={closestParking?.id === parking.id}
            onHover={handleHover}
          />
        ))}
      </MapContainer>
      
      {/* Tooltip flotante para hover - ahora en la esquina superior derecha */}
      {hoveredParking && (
        <div 
          className="fixed z-[1000] bg-white rounded-xl shadow-2xl p-3 max-w-xs w-72 pointer-events-none animate-fade-in"
          style={{
            top: '16px',
            right: '16px',
            left: 'auto',
            bottom: 'auto',
          }}
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">🅿️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">{hoveredParking.name}</h4>
              <p className="text-xs text-gray-500 break-words line-clamp-2">{hoveredParking.address}</p>
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs font-semibold ${hoveredParking.availability.available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {hoveredParking.availability.available} lugares libres
                </span>
                <span className="text-xs text-gray-400">
                  {hoveredParking.distance >= 1000 
                    ? `${(hoveredParking.distance / 1000).toFixed(1)} km`
                    : `${Math.round(hoveredParking.distance)} m`}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-gray-400">
                <span>🕒 {hoveredParking.openTime} - {hoveredParking.closeTime}</span>
              </div>
              <div className="mt-1 text-[10px] font-medium text-blue-600 truncate">
                {getRateSummary(hoveredParking.rates)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs shadow-md z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Completo</span>
        </div>
      </div>
    </div>
  );
}

export default ParkingMapView;