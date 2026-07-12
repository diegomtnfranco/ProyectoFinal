import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, MapPin, Search, Clock } from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuthStore } from '../../../stores';
import { useToast } from '../../../shared/hooks/useToast';
import type { RegisterOwnerCompleteDto } from '../../../types/auth.types';

// Fix íconos leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Position = [number, number];

// Componente para cambiar la vista del mapa
interface ChangeMapViewProps {
  center: Position;
}

function ChangeMapView({ center }: ChangeMapViewProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

// Componente para obtener dirección desde coordenadas
const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Error al obtener la dirección');
    }
    
    const data = await response.json();
    return data.display_name || `${lat}, ${lng}`;
  } catch (err) {
    console.error('Error en geocodificación inversa:', err);
    return `${lat}, ${lng}`;
  }
};

// Componente del marcador con geocodificación inversa
interface LocationMarkerProps {
  position: Position | null;
  setPosition: React.Dispatch<React.SetStateAction<Position | null>>;
  setAddress: React.Dispatch<React.SetStateAction<string>>;
  setIsSearching?: React.Dispatch<React.SetStateAction<boolean>>;
}

function LocationMarker({ position, setPosition, setAddress, setIsSearching }: LocationMarkerProps) {
  const map = useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      
      // Mostrar indicador de carga
      if (setIsSearching) setIsSearching(true);
      
      // Obtener dirección desde las coordenadas
      const address = await getAddressFromCoordinates(lat, lng);
      setAddress(address);
      
      if (setIsSearching) setIsSearching(false);
    },
  });
  
  return position ? <Marker position={position} /> : null;
}

function CompanyLocationForm() {
  const navigate = useNavigate();
  const { registerOwnerComplete, isLoading } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const { user, token, isLoading: authLoading } = useAuthStore();

  // Estados del formulario
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('22:00');
  
  // Estados de UI
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

useEffect(() => {
    if (token && user) {
      // Si ya es dueño, redirigir a su dashboard
      if (user.role === 'parking_owner') {
        navigate('/owner');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'client') {
        // Si es cliente, no debería estar aquí, redirigir a su dashboard
        navigate('/client');
      }
    }
  }, [token, user, navigate]);



  // Cargar datos guardados al montar el componente
  useEffect(() => {
    const savedData = localStorage.getItem('companyData');
    if (!savedData) {
      setError('No se encontraron datos del registro. Por favor, volvé al paso anterior.');
      setTimeout(() => {
        navigate('/create-company');
      }, 3000);
      return;
    }
  }, [navigate]);

  // Buscar dirección con OpenStreetMap
  const searchAddress = async () => {
    if (!address.trim()) {
      setError('Ingresá una dirección para buscar');
      return;
    }

    try {
      setLoadingSearch(true);
      setError('');

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );

      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }

      const data = await response.json();

      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setPosition([lat, lon]);
        // La dirección ya está en el input, no necesitamos cambiarla
      } else {
        setError('No se encontró la dirección. Intentá con términos más precisos.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al buscar la dirección');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Validación
  const isFormValid = address.trim() !== '' && position !== null;

  const handleFinish = async () => {
    if (!isFormValid || !position) {
      setError('Debés ingresar una dirección válida y seleccionar una ubicación en el mapa');
      return;
    }

    try {
      // Datos anteriores del localStorage
      const previousData = localStorage.getItem('companyData');
      if (!previousData) {
        setError('No se encontraron datos del registro. Por favor, volvé a empezar.');
        navigate('/create-company');
        return;
      }

      const companyData = JSON.parse(previousData);

      // Validar que tenemos todos los datos necesarios
      if (!companyData.fullName || !companyData.email || !companyData.password || !companyData.confirmPassword) {
        setError('Faltan datos del registro. Por favor, volvé al paso anterior.');
        navigate('/create-company');
        return;
      }

      // Validar que las contraseñas coincidan (por si acaso)
      if (companyData.password !== companyData.confirmPassword) {
        setError('Las contraseñas no coinciden. Por favor, volvé al paso anterior.');
        navigate('/create-company');
        return;
      }

      // Preparar datos para el backend
      const registerData:RegisterOwnerCompleteDto = {
        // Datos del usuario
        email: companyData.email,
        password: companyData.password,
        confirmPassword: companyData.confirmPassword,
        
        // Datos del dueño
        name: companyData.fullName,
        businessName: companyData.parkingName,
        phone: companyData.phone || '',
        address: address,
        
        // Datos del estacionamiento
        parkingName: companyData.parkingName,
        latitude: position[0],
        longitude: position[1],
        openTime: openTime,
        closeTime: closeTime,
        totalSpaces: Number(companyData.capacity),
        allowOnlineReservations: companyData.acceptReservations === true,
      };
      
        if (companyData.cuit) {
            registerData.cuit = companyData.cuit;
        }

      // Llamar al servicio
      const response = await registerOwnerComplete(registerData);
      
      
      // Guardar mensaje de éxito
      setSuccessMessage(response.message || 'Estacionamiento creado exitosamente');
      
      // Limpiar localStorage
      localStorage.removeItem('companyData');
      
      // Mostrar modal de éxito
      setShowSuccessModal(true);
      
      // Mostrar toast de éxito
      showSuccess('¡Registro completado! Revisá tu email para verificar tu cuenta.');

      // Redirigir al login después de 5 segundos
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err) {
      console.error('Error en registro:', err);
      const errorMessage = typeof err === 'string' ? err : 'Ocurrió un error al crear la empresa';
      
      if (errorMessage.includes('email') || errorMessage.includes('registrado')) {
        setError('Este email ya está registrado. Por favor, usá otro o iniciá sesión.');
        showError('Email ya registrado');
      } else if (errorMessage.includes('CUIT')) {
        setError('El CUIT ingresado ya está registrado.');
        showError('CUIT ya registrado');
      } else if (errorMessage.includes('contraseña') || errorMessage.includes('password')) {
        setError('Error con la contraseña. Por favor, volvé al paso anterior y verificá que coincidan.');
        showError('Las contraseñas no coinciden');
      } else {
        setError(errorMessage);
        showError(errorMessage);
      }
    }
  };

  const defaultCenter: LatLngExpression = [-26.8083, -65.2176]; // Tucumán, Argentina

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
      <div className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-4xl flex flex-col gap-6'>
        
        {/* Header */}
        <div>
          <h1 className='text-3xl font-bold'>Ubicación del estacionamiento</h1>
          <p className='text-gray-500'>Ingresá la dirección física de tu estacionamiento</p>
        </div>

        {/* Dirección y búsqueda */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium flex items-center gap-2'>
            <MapPin size={18} className='text-gray-500' />
            Dirección física
          </label>
          <div className='flex gap-2'>
            <input
              type='text'
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder='Ej: Av. Independencia 123, San Miguel de Tucumán'
              disabled={isLoading}
              className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 flex-1 disabled:bg-gray-100'
            />
            <button
              type='button'
              onClick={searchAddress}
              disabled={!address.trim() || loadingSearch || isLoading}
              className={`px-5 rounded-xl text-white font-semibold transition-all flex items-center gap-2 ${
                address.trim() && !isLoading
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loadingSearch ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Buscando...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Buscar
                </>
              )}
            </button>
          </div>
          <p className='text-xs text-gray-500'>
            Podés escribir la dirección y presionar "Buscar", o hacer click directamente en el mapa
          </p>
        </div>

        {/* Horarios */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='flex flex-col gap-2'>
            <label className='font-medium flex items-center gap-2'>
              <Clock size={18} className='text-gray-500' />
              Hora de apertura
            </label>
            <input
              type='time'
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              disabled={isLoading}
              className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
            />
          </div>
          <div className='flex flex-col gap-2'>
            <label className='font-medium flex items-center gap-2'>
              <Clock size={18} className='text-gray-500' />
              Hora de cierre
            </label>
            <input
              type='time'
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              disabled={isLoading}
              className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className='bg-red-100 text-red-600 p-3 rounded-xl text-sm'>
            {error}
          </div>
        )}

        {/* Mapa */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Ubicación en el mapa</label>
          <div className='overflow-hidden rounded-2xl border border-gray-300 z-0'>
            <MapContainer
              center={defaultCenter}
              zoom={13}
              scrollWheelZoom
              className='h-[400px] w-full'
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              />
              {position && <ChangeMapView center={position} />}
              <LocationMarker 
                position={position} 
                setPosition={setPosition}
                setAddress={setAddress}
                setIsSearching={setLoadingSearch}
              />
            </MapContainer>
          </div>
          <p className='text-sm text-gray-500 flex items-center gap-1'>
            <MapPin size={14} />
            {position 
              ? `Ubicación seleccionada: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
              : 'Hacé click en el mapa para seleccionar la ubicación exacta'}
          </p>
        </div>

        {/* Información de ayuda */}
        <div className='bg-blue-50 rounded-xl p-4'>
          <h3 className='font-semibold text-blue-800 mb-2'>📌 ¿Cómo funciona?</h3>
          <ul className='text-sm text-blue-700 space-y-1'>
            <li>• <strong>Opción 1:</strong> Escribí la dirección y presioná "Buscar" para localizarla</li>
            <li>• <strong>Opción 2:</strong> Hacé click directamente en el mapa para marcar la ubicación exacta</li>
            <li>• <strong>Importante:</strong> La ubicación precisa ayudará a los clientes a encontrar tu estacionamiento</li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className='flex flex-col gap-3'>
          <button
            type='button'
            onClick={handleFinish}
            disabled={!isFormValid || isLoading}
            className={`text-white font-semibold py-3 rounded-xl transition-all ${
              isFormValid && !isLoading
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                Creando empresa...
              </span>
            ) : (
              'Finalizar y crear empresa'
            )}
          </button>

          <button
            type='button'
            onClick={() => navigate('/create-company')}
            className='text-gray-500 hover:text-gray-700 py-2 transition-colors'
            disabled={isLoading}
          >
            ← Volver al paso anterior
          </button>
        </div>
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4'>
          <div className='bg-white rounded-3xl p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl animate-fade-in'>
            <CheckCircle size={80} className='text-green-500 mb-4' />
            <h2 className='text-2xl font-bold mb-2'>¡Empresa creada!</h2>
            <p className='text-gray-600'>{successMessage}</p>
            <div className='mt-4 p-3 bg-blue-50 rounded-xl w-full'>
              <p className='text-blue-800 text-sm font-medium'>📧 Verificación de email</p>
              <p className='text-blue-600 text-xs mt-1'>
                Te enviamos un correo de verificación. Por favor, revisá tu bandeja de entrada y hacé click en el enlace para activar tu cuenta.
              </p>
            </div>
            <div className='mt-4 p-3 bg-yellow-50 rounded-xl w-full'>
              <p className='text-yellow-800 text-sm font-medium'>⏳ Aprobación pendiente</p>
              <p className='text-yellow-600 text-xs mt-1'>
                Tu cuenta será revisada por un administrador. Te notificaremos cuando sea aprobada.
              </p>
            </div>
            <div className='mt-6 flex gap-2 justify-center'>
              <div className='w-3 h-3 bg-green-500 rounded-full animate-bounce'></div>
              <div className='w-3 h-3 bg-green-500 rounded-full animate-bounce delay-100'></div>
              <div className='w-3 h-3 bg-green-500 rounded-full animate-bounce delay-200'></div>
            </div>
            <p className='text-gray-400 text-xs mt-4'>
              Redirigiendo al inicio de sesión en unos segundos...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyLocationForm;