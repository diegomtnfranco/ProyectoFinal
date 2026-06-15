import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../../shared/hooks/useToast';
import { api } from '../../../services/api';
import { Car, Truck, Bus, Loader2, CheckCircle, XCircle, ArrowLeft, Clock, Motorbike } from 'lucide-react';

// Mapeo de tipos de vehículo
const vehicleIcons = {
  car: <Car size={28} />,
  motorcycle: <Motorbike size={28} />,
  van: <Truck size={28} />,
  truck: <Bus size={28} />,
};

const vehicleLabels = {
  car: 'Auto',
  motorcycle: 'Moto',
  van: 'Camioneta',
  truck: 'Camioneta',
};

const vehicleTypes = [
  { id: 'car', label: 'Auto', icon: <Car size={24} />, color: 'blue' },
  { id: 'motorcycle', label: 'Moto', icon: <Motorbike size={24} />, color: 'green' },
 // { id: 'van', label: 'Camioneta', icon: <Truck size={24} />, color: 'orange' },
  { id: 'truck', label: 'Camioneta', icon: <Bus size={24} />, color: 'orange' },
];

function ScanQRPage() {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const token = searchParams.get('token');

  const [selectedVehicle, setSelectedVehicle] = useState<string>('car');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');
  const [responseData, setResponseData] = useState<any>(null);

  // Validar token al cargar
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('QR inválido o expirado');
    }
  }, [token]);

  // Check-in: seleccionar vehículo y enviar
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicle) {
      showError('Seleccioná el tipo de vehículo');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/occupancy/anonymous/check-in', {
        token,
        vehicleType: selectedVehicle,
      });
      
      setResponseData(response.data);
      setStatus('success');
      setMessage(`✅ ¡Check-in registrado! Espacio asignado: ${response.data.spaceNumber}`);
      showSuccess('Entrada registrada exitosamente');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al registrar entrada';
      setStatus('error');
      setMessage(`❌ ${errorMsg}`);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Check-out: confirmar salida
  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/occupancy/anonymous/check-out', {
        token,
      });
      
      setResponseData(response.data);
      setStatus('success');
      setMessage(`✅ ¡Check-out registrado! Total: $${response.data.totalAmount}`);
      showSuccess(`Salida registrada. Total: $${response.data.totalAmount}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al registrar salida';
      setStatus('error');
      setMessage(`❌ ${errorMsg}`);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Pantalla de éxito
  if (status === 'success') {
    const isCheckIn = type === 'check-in';
    const successColor = isCheckIn ? 'text-green-500' : 'text-blue-500';
    const bgColor = isCheckIn ? 'bg-green-50' : 'bg-blue-50';
    
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle size={64} className={`${successColor} mx-auto mb-4`} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isCheckIn ? '¡Bienvenido!' : '¡Gracias por tu visita!'}
          </h2>
          <p className="text-gray-600 mb-4">{message}</p>
          
          {responseData?.spaceNumber && (
            <div className={`${bgColor} rounded-xl p-4 mb-4`}>
              <p className={`font-semibold ${isCheckIn ? 'text-green-700' : 'text-blue-700'}`}>
                Espacio asignado: <span className="font-bold text-2xl">{responseData.spaceNumber}</span>
              </p>
            </div>
          )}
          
          {responseData?.totalAmount && (
            <div className="bg-green-50 rounded-xl p-4 mb-4">
              <p className="text-green-700 font-semibold text-lg">
                Total: ${responseData.totalAmount}
              </p>
              <p className="text-green-600 text-sm">Horas: {responseData.hours}</p>
            </div>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de error
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de selección para Check-in
  if (type === 'check-in') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={40} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Registrar entrada</h1>
            <p className="text-gray-500 mt-2">Seleccioná el tipo de vehículo para comenzar</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleCheckIn} className="bg-white rounded-3xl shadow-xl p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de vehículo
              </label>
              <div className="grid grid-cols-2 gap-3">
                {vehicleTypes.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedVehicle === vehicle.id
                        ? `border-${vehicle.color}-500 bg-${vehicle.color}-50 text-${vehicle.color}-600`
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className={selectedVehicle === vehicle.id ? `text-${vehicle.color}-600` : 'text-gray-500'}>
                      {vehicle.icon}
                    </div>
                    <span className="text-sm font-medium">{vehicle.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedVehicle}
              className="w-full py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar entrada'
              )}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <p className="text-xs text-gray-500 text-center">
              Al escanear este QR, se registrará la entrada de tu vehículo.
              El tiempo comenzará a contar desde este momento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de confirmación para Check-out
  if (type === 'check-out') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={40} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Registrar salida</h1>
            <p className="text-gray-500 mt-2">Confirmá tu salida para finalizar la estadía</p>
          </div>

          {/* Confirmación */}
          <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={32} className="text-yellow-600" />
              </div>
              <p className="text-gray-600">
                Al confirmar tu salida, se calculará el tiempo de estadía y el monto a pagar.
              </p>
            </div>

            <button
              onClick={handleCheckOut}
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar salida'
              )}
            </button>
          </div>

          {/* Información adicional */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <p className="text-xs text-gray-500 text-center">
              Al escanear este QR, se registrará la salida de tu vehículo.
              El sistema calculará automáticamente el monto según el tiempo de estadía.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tipo de QR no válido
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        <XCircle size={64} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">QR inválido</h2>
        <p className="text-gray-600 mb-6">
          El código QR que escaneaste no es válido o ha expirado.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default ScanQRPage;