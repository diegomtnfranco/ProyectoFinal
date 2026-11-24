import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock3, 
  CircleDot, 
  Car, 
  Navigation, 
  AlertCircle, 
  ChevronLeft,
  DollarSign,
  Calendar,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { useParkingLotsStore } from '../../../stores/parkingStore';
import { useReservationsStore } from '../../../stores/reservationStore';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../shared/hooks/useToast';
import { VehicleType, type UserVehicleType } from '../../../types/auth.types';
import ParkingPublicInfo from '../components/ParkingPublicInfo';
import ScheduledReservationPicker, {
  type ScheduledSelection,
} from '../../../shared/components/reservation/ScheduledReservationPicker';
import type { Reservation } from '../../../types/parking.types';

function ParkingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createReservation, isLoading: isCreatingReservation } = useReservationsStore();
  const { showSuccess, showError } = useToast();

  // Estados del parking
  const [parking, setParking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [availability, setAvailability] = useState({ total: 0, available: 0, occupied: 0, reserved: 0 });

  // Estados del formulario
  const [vehicleType, setVehicleType] = useState<string>('car');
  const [vehiclePlate, setVehiclePlate] = useState('');
  // Reserva programada: el sistema devuelve solo horarios habilitados
  const [showSchedule, setShowSchedule] = useState(false);
  const [selection, setSelection] = useState<ScheduledSelection | null>(null);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Cargar datos del parking
  useEffect(() => {
    const fetchParkingDetails = async () => {
      if (!id) {
        setError('ID de estacionamiento no encontrado');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Usar el endpoint de parkings cercanos o el de detalle
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/parking-lots/${id}`);
        if (!response.ok) throw new Error('Error al cargar el estacionamiento');
        const data = await response.json();
        
        setParking(data);
        
        // Cargar tarifas
        if (data.rates) {
          setRates(data.rates);
        }
        
        // Cargar disponibilidad
        const availabilityResponse = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/parking-lots/${id}/availability`);
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          setAvailability(availabilityData);
        }
      } catch (err) {
        console.error('Error fetching parking:', err);
        setError('No se pudo cargar la información del estacionamiento');
      } finally {
        setIsLoading(false);
      }
    };

    fetchParkingDetails();
  }, [id]);

  // Obtener tarifa para el tipo de vehículo seleccionado
  const getRateForVehicle = (type: string) => {
    const rate = rates.find(r => r.vehicleType === type);
    return rate?.pricePerHour || rate?.price || 0;
  };

  const pricePerHour = getRateForVehicle(vehicleType);

  // Validaciones (los horarios ya vienen validados por el backend)
  const validateForm = (requireSchedule = true) => {
    const errors: { [key: string]: string } = {};

    if (!vehiclePlate.trim()) {
      errors.vehiclePlate = 'La patente es obligatoria';
    } else if (vehiclePlate.length < 4) {
      errors.vehiclePlate = 'La patente debe tener al menos 4 caracteres';
    }

    if (requireSchedule && !selection) {
      errors.schedule = 'Elegí el horario de ingreso y el de egreso';
    }

    if (pricePerHour === 0 && rates.length > 0) {
      errors.vehicleType = 'No hay tarifa disponible para este tipo de vehículo';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) =>
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Botón "Reservar": muestra los horarios habilitados
  const handleOpenSchedule = () => {
    if (!user) {
      showError('Debés iniciar sesión para reservar');
      navigate('/');
      return;
    }
    if (!validateForm(false)) return;
    setShowSchedule(true);
  };

  // Crear reserva
  const handleReserve = async () => {
    if (!user) {
      showError('Debés iniciar sesión para reservar');
      navigate('/');
      return;
    }

    if (!validateForm() || !selection) {
      showError('Por favor, completá los datos y elegí los horarios');
      return;
    }

    try {
      const reservationData = {
        parkingLotId: id!,
        vehicleType: vehicleType as UserVehicleType,
        vehiclePlate: vehiclePlate.toUpperCase().trim(),
        startTime: selection.startTime,
        endTime: selection.endTime,
      };

      const created = await createReservation(reservationData);
      setCreatedReservation(created);
      showSuccess('¡Reserva creada! Esperá la confirmación del estacionamiento.');
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Error al crear la reserva';
      showError(errorMsg);
    }
  };

  // Formatear tarifas para mostrar
  const getRateDisplay = () => {
    if (!rates || rates.length === 0) {
      return <p className="text-gray-500">Consultar tarifas</p>;
    }
    
    const vehicleTypeLabels: Record<string, string> = {
      car: 'Auto',
      motorcycle: 'Moto',
      //van: 'Van',
      truck: 'Camioneta',
    };
    
    return (
      <div className="space-y-2">
        <p className="font-medium text-gray-700">Tarifas por hora:</p>
        <div className="flex flex-wrap gap-2">
          {rates.map((rate) => (
            <div
              key={rate.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                vehicleType === rate.vehicleType 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="text-xs">
                {vehicleTypeLabels[rate.vehicleType] || rate.vehicleType}
              </span>
              <span className="font-semibold">${rate.pricePerHour || rate.price}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Cargando información del estacionamiento...</p>
        </div>
      </div>
    );
  }

  if (error || !parking) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
        <div className='bg-white rounded-3xl shadow-xl p-8 max-w-md text-center'>
          <AlertCircle size={64} className='text-red-500 mx-auto mb-4' />
          <h2 className='text-2xl font-bold mb-2'>Error</h2>
          <p className='text-gray-600 mb-6'>{error || 'Estacionamiento no encontrado'}</p>
          <button
            onClick={() => navigate('/')}
            className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all'
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      <main className='max-w-6xl mx-auto p-4'>
        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className='flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-4 transition-colors'
        >
          <ChevronLeft size={20} />
          Volver
        </button>

        <div className='bg-white rounded-3xl shadow-md overflow-hidden'>
          {/* FOTO DEL ESTACIONAMIENTO */}
          <div className='w-full h-80 bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center'>
            <span className='text-white text-8xl'>🅿️</span>
          </div>

          <div className='p-8 flex flex-col gap-6'>
            {/* NOMBRE Y DIRECCIÓN */}
            <div>
              <h1 className='text-4xl font-bold'>{parking.name}</h1>
              <p className='text-gray-500 mt-2'>{parking.address}</p>
            </div>

            {/* INFORMACIÓN GENERAL */}
            <div className='flex flex-wrap gap-4'>
              {/* DISPONIBILIDAD */}
              <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
                availability.available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <CircleDot size={18} />
                {availability.available} lugares disponibles
              </div>

              {/* HORARIO */}
              <div className='bg-blue-100 text-blue-700 px-4 py-2 rounded-xl flex items-center gap-2'>
                <Clock3 size={18} />
                {parking.openTime} - {parking.closeTime}
              </div>

              {/* DISTANCIA (si está disponible) */}
              {parking.distance && (
                <div className='bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl flex items-center gap-2'>
                  <Navigation size={18} />
                  {(parking.distance / 1000).toFixed(1)} km
                </div>
              )}

              {/* CÓMO LLEGAR */}
              <button
                onClick={() => window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}`,
                  '_blank'
                )}
                className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2'
              >
                <MapPin size={18} />
                Cómo llegar
              </button>
            </div>

            <hr />

            {/* INFORMACIÓN PUBLICADA POR EL ESTACIONAMIENTO (solo lectura) */}
            {id && <ParkingPublicInfo parkingLotId={id} />}

            {/* TARIFAS */}
            <div className='bg-blue-50 rounded-2xl p-6'>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={20} className="text-blue-600" />
                <h2 className="text-xl font-semibold">Tarifas</h2>
              </div>
              {getRateDisplay()}
            </div>

            {/* CONFIRMACIÓN: dónde está la reserva y cuándo empieza/termina la tarifa */}
            {createdReservation && selection ? (
              <div className='rounded-2xl border border-green-300 bg-green-50 p-6'>
                <h2 className='flex items-center gap-2 text-2xl font-bold text-green-800'>
                  <CheckCircle2 size={24} /> ¡Reserva registrada!
                </h2>
                <div className='mt-4 grid gap-3 sm:grid-cols-2 text-gray-700'>
                  <p>
                    <span className='block text-sm text-gray-500'>Estacionamiento</span>
                    <strong>{createdReservation.parkingLotName || parking.name}</strong>
                    <span className='block text-sm'>{createdReservation.parkingLotAddress || parking.address}</span>
                  </p>
                  <p>
                    <span className='block text-sm text-gray-500'>Espacio asignado</span>
                    <strong className='text-xl'>{createdReservation.spaceNumber}</strong>
                  </p>
                  <p>
                    <span className='block text-sm text-gray-500'>Tu tarifa empieza a contar</span>
                    <strong className='capitalize'>{selection.startLabel}</strong>
                  </p>
                  <p>
                    <span className='block text-sm text-gray-500'>Termina (aprox.)</span>
                    <strong className='capitalize'>{selection.endLabel}</strong>
                  </p>
                  <p>
                    <span className='block text-sm text-gray-500'>Total estimado</span>
                    <strong>${Number(createdReservation.totalAmount ?? selection.exit.totalAmount).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</strong>
                    {createdReservation.isScheduled && !!createdReservation.discountPercent && (
                      <span className='ml-2 inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs text-white'>
                        <Tag size={12} /> Programada -{createdReservation.discountPercent}%
                      </span>
                    )}
                  </p>
                  <p>
                    <span className='block text-sm text-gray-500'>Patente</span>
                    <strong className='font-mono'>{createdReservation.vehiclePlate}</strong>
                  </p>
                </div>
                <p className='mt-4 text-sm text-gray-600'>
                  No hace falta que ingreses ahora: el lugar queda reservado para ese horario. Te avisaremos cuando el
                  estacionamiento confirme la reserva.
                </p>
                <button
                  onClick={() => navigate('/client/my-reservations')}
                  className='mt-4 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700'
                >
                  Ver mis reservas
                </button>
              </div>
            ) : (
              <>
                <h2 className='text-2xl font-bold flex items-center gap-2'>
                  <Calendar size={22} />
                  Reservar espacio
                </h2>

                {availability.available === 0 && (
                  <div className='bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-center gap-3 text-sm'>
                    <AlertCircle size={18} />
                    <span>Ahora está completo, pero podés reservar para un horario futuro.</span>
                  </div>
                )}

                <div className='grid md:grid-cols-2 gap-4'>
                  {/* TIPO DE VEHÍCULO */}
                  <div>
                    <label className='flex items-center gap-2 mb-2 font-medium'>
                      <Car size={18} />
                      Tipo de vehículo
                    </label>
                    <select
                      className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.vehicleType ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={vehicleType}
                      onChange={(e) => {
                        setVehicleType(e.target.value);
                        setSelection(null);
                        clearFieldError('vehicleType');
                      }}
                    >
                      <option value='car'>Auto</option>
                      <option value='motorcycle'>Moto</option>
                      {/* <option value='van'>Van</option> */}
                      <option value='truck'>Camioneta</option>
                    </select>
                    {validationErrors.vehicleType && (
                      <p className='text-red-500 text-xs mt-1'>{validationErrors.vehicleType}</p>
                    )}
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
                      onChange={(e) => {
                        setVehiclePlate(e.target.value.toUpperCase());
                        clearFieldError('vehiclePlate');
                      }}
                      className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                        validationErrors.vehiclePlate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.vehiclePlate && (
                      <p className='text-red-500 text-xs mt-1'>{validationErrors.vehiclePlate}</p>
                    )}
                  </div>
                </div>

                {!showSchedule ? (
                  <button
                    onClick={handleOpenSchedule}
                    className='py-4 rounded-xl font-semibold transition-all text-white flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700'
                  >
                    <Calendar size={18} />
                    Reservar
                  </button>
                ) : (
                  <>
                    {id && (
                      <ScheduledReservationPicker
                        key={vehicleType}
                        parkingLotId={id}
                        vehicleType={vehicleType}
                        onChange={setSelection}
                      />
                    )}
                    {validationErrors.schedule && !selection && (
                      <p className='text-red-500 text-sm'>{validationErrors.schedule}</p>
                    )}

                    <button
                      onClick={handleReserve}
                      disabled={isCreatingReservation || !selection}
                      className={`py-4 rounded-xl font-semibold transition-all text-white flex items-center justify-center gap-2
                        ${selection && !isCreatingReservation
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {isCreatingReservation ? (
                        <>
                          <div className='animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent'></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Calendar size={18} />
                          Confirmar reserva
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Información adicional */}
                <div className='bg-gray-50 rounded-xl p-4 text-sm text-gray-500'>
                  <p className="flex items-center gap-2">
                    <Clock3 size={14} />
                    Las reservas requieren confirmación del estacionamiento.
                  </p>
                  <p className="flex items-center gap-2 mt-1">
                    <CircleDot size={14} />
                    Recibirás una notificación cuando tu reserva sea confirmada.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ParkingDetailsPage;