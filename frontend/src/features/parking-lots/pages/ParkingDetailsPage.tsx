// import ParkingPhoto from '../../../assets/images/Parking-Photo.jpg'
// import {
//   MapPin,
//   Clock3,
//   CircleDot,
//   Car
// } from 'lucide-react'
// import { useState } from 'react'
// import { reservationsService } from '../../../services/reservations.service'
// import { useParams } from 'react-router-dom'



// function ParkingDetailsPage() {

//   const { id } = useParams()


//   // ============================================
//   // ESTADOS DEL FORMULARIO
//   // ============================================

//   const [vehicleType, setVehicleType] = useState('car')
//   const [vehiclePlate, setVehiclePlate] = useState('')
//   const [startTime, setStartTime] = useState('')
//   const [endTime, setEndTime] = useState('')

//   // ============================================
//   // CÁLCULO DE HORAS Y PRECIO
//   // ============================================

//  const totalHours =
//   startTime &&
//   endTime &&
//   new Date(endTime) > new Date(startTime)
//     ? Math.ceil(
//         (
//           new Date(endTime).getTime() -
//           new Date(startTime).getTime()
//         ) / (1000 * 60 * 60)
//       )
//     : 0


// const mockParkings = [
//   {
//     id: '1',
//     name: 'Parking Centro',
//     address: 'San Miguel de Tucumán',
//     image: ParkingPhoto,
//     latitude: -26.828954,
//     longitude: -65.204266,
//     distance: 1200,
//     openTime: '08:00',
//     closeTime: '22:00',
//     availability: {
//       total: 50,
//       available: 15,
//       occupied: 30,
//       reserved: 5,
//     },
//   },

//   {
//     id: '2',
//     name: 'Parking Norte',
//     address: 'Yerba Buena',
//     image: ParkingPhoto,
//     latitude: -26.800000,
//     longitude: -65.300000,
//     distance: 2500,
//     openTime: '07:00',
//     closeTime: '23:00',
//     availability: {
//       total: 40,
//       available: 0,
//       occupied: 38,
//       reserved: 2,
//     },
//   },
// ]

// const parking = mockParkings.find(
//   parking => parking.id === id
// )


// if (!parking) {
//   return (
//     <div className='p-6'>
//       Estacionamiento no encontrado
//     </div>
//   )
// }

//   // ============================================
//   // PRECIO MOCK
//   // Luego vendrá desde Rates del backend
//   // ============================================

//   const pricePerHour = 1500

//   const totalPrice = totalHours * pricePerHour

//   // ============================================
//   // CREAR RESERVA
//   // ============================================

//  const handleReserve = async () => {

//   // Verificar disponibilidad
//   if (parking.availability.available === 0) {
//     alert('Este estacionamiento no tiene lugares disponibles')
//     return
//   }

//   // Verificar campos obligatorios
//   if (!vehiclePlate || !startTime || !endTime) {
//     alert('Completá todos los campos')
//     return
//   }

//   if (new Date(endTime) <= new Date(startTime)) {
//   alert('La fecha de fin debe ser posterior a la de inicio')
//   return
// }

//   try {

//     const reservation = await reservationsService.create({
//       parkingLotId: parking.id,
//       vehicleType,
//       vehiclePlate,
//       startTime,
//       endTime,
//     })

//     console.log('Reserva creada:', reservation)

//     alert('Reserva creada correctamente')

//   } catch (error) {

//     console.error(error)

//     alert(String(error))

//   }
// }

//   return (
//     <div className='min-h-screen bg-gray-100'>

//       <main className='max-w-6xl mx-auto p-4'>

//         <div className='bg-white rounded-3xl shadow-md overflow-hidden'>

//           {/* FOTO DEL ESTACIONAMIENTO */}

//           <img
//             src={parking.image}
//             alt={parking.name}
//             className='w-full h-80 object-cover'
//           />

//           <div className='p-8 flex flex-col gap-6'>

//             {/* NOMBRE Y DIRECCIÓN */}

//             <div>

//               <h1 className='text-4xl font-bold'>
//                 {parking.name}
//               </h1>

//               <p className='text-gray-500 mt-2'>
//                 {parking.address}
//               </p>

//             </div>

//             {/* INFORMACIÓN GENERAL */}

//             <div className='flex flex-wrap gap-4'>

//               {/* DISPONIBILIDAD */}

//               <div className='bg-green-100 text-green-700 px-4 py-2 rounded-xl flex items-center gap-2'>
//                 <CircleDot size={18} />
//                 {parking.availability.available} lugares disponibles
//               </div>

//               {/* HORARIO */}

//               <div className='bg-blue-100 text-blue-700 px-4 py-2 rounded-xl flex items-center gap-2'>
//                 <Clock3 size={18} />
//                 {parking.openTime} - {parking.closeTime}
//               </div>

//               {/* DISTANCIA Y MAPA */}

//               <div className='flex items-center gap-3'>

//                 <div className='bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl flex items-center gap-2'>
//                   <MapPin size={18} />
//                   {(parking.distance / 1000).toFixed(1)} km
//                 </div>

//                 <button
//                   onClick={() =>
//                     window.open(
//                       `https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}`,
//                       '_blank'
//                     )
//                   }
//                   className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl'
//                 >
//                   Cómo llegar
//                 </button>

//               </div>

//             </div>

//             <hr />

//             {/* TARIFA */}

//             <div className='bg-blue-50 rounded-2xl p-6'>

//               <p className='text-gray-500'>
//                 Tarifa actual
//               </p>

//               <h2 className='text-3xl font-bold text-blue-600'>
//                 ${pricePerHour} / hora
//               </h2>

//             </div>

//             {/* RESUMEN DEL COSTO */}

//             {totalHours > 0 && (
//               <div className='bg-green-50 border border-green-200 rounded-2xl p-4'>

//                 <h3 className='font-bold text-lg'>
//                   Resumen de la reserva
//                 </h3>

//                 <p>
//                   Horas: {totalHours}
//                 </p>

//                 <p className='font-semibold text-green-700'>
//                   Total estimado: ${totalPrice}
//                 </p>

//               </div>
//             )}

//             {/* FORMULARIO */}

// {parking.availability.available === 0 && (
//   <div className='bg-red-100 border border-red-300 text-red-700 p-4 rounded-xl'>
//     Este estacionamiento se encuentra completo actualmente.
//   </div>
// )}

//             <h2 className='text-2xl font-bold'>
//               Reservar espacio
//             </h2>

//             <div className='grid md:grid-cols-2 gap-4'>

//               {/* TIPO DE VEHÍCULO */}

//               <div>

//                 <label className='flex items-center gap-2 mb-2 font-medium'>
//                   <Car size={18} />
//                   Tipo de vehículo
//                 </label>

//                 <select
//                   className='w-full border rounded-xl p-3'
//                   value={vehicleType}
//                   onChange={(e) => setVehicleType(e.target.value)}
//                 >
//                   <option value='car'>Auto</option>
//                   <option value='motorcycle'>Moto</option>
//                   <option value='van'>Camioneta</option>
//                   <option value='truck'>Camión</option>
//                 </select>

//               </div>

//               {/* PATENTE */}

//               <div>

//                 <label className='block mb-2 font-medium'>
//                   Patente
//                 </label>

//                 <input
//                   type='text'
//                   placeholder='ABC123'
//                   value={vehiclePlate}
//                   onChange={(e) => setVehiclePlate(e.target.value)}
//                   className='w-full border rounded-xl p-3'
//                 />

//               </div>

//               {/* FECHA INICIO */}

//               <div>

//                 <label className='block mb-2 font-medium'>
//                   Fecha y hora de inicio
//                 </label>

//                 <input
//                   type='datetime-local'
//                   value={startTime}
//                   onChange={(e) => setStartTime(e.target.value)}
//                   className='w-full border rounded-xl p-3'
//                 />

//               </div>

//               {/* FECHA FIN */}

//               <div>

//                 <label className='block mb-2 font-medium'>
//                   Fecha y hora de fin
//                 </label>

//                 <input
//                   type='datetime-local'
//                   value={endTime}
//                   onChange={(e) => setEndTime(e.target.value)}
//                   className='w-full border rounded-xl p-3'
//                 />

//               </div>

//             </div>

//             {/* BOTÓN RESERVAR */}

//             <button
//   onClick={handleReserve}
//   disabled={parking.availability.available === 0}
//   className={`py-4 rounded-xl font-semibold transition-all text-white
//     ${
//       parking.availability.available > 0
//         ? 'bg-blue-600 hover:bg-blue-700'
//         : 'bg-gray-400 cursor-not-allowed'
//     }`}
// >
//   {parking.availability.available > 0
//     ? 'Reservar espacio'
//     : 'Sin disponibilidad'}
// </button>

//           </div>

//         </div>

//       </main>

//     </div>
//   )
// }

// export default ParkingDetailsPage

// frontend/src/features/parking-lots/pages/ParkingDetailsPage.tsx
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
  CreditCard
} from 'lucide-react';
import { useParkingLotsStore } from '../../../stores/parkingStore';
import { useReservationsStore } from '../../../stores/reservationStore';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../shared/hooks/useToast';
import { VehicleType, type UserVehicleType } from '../../../types/auth.types';

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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/parking-lots/${id}`);
        if (!response.ok) throw new Error('Error al cargar el estacionamiento');
        const data = await response.json();
        
        setParking(data);
        
        // Cargar tarifas
        if (data.rates) {
          setRates(data.rates);
        }
        
        // Cargar disponibilidad
        const availabilityResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/parking-lots/${id}/availability`);
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

  // Cálculo de horas y precio
  const totalHours = startTime && endTime && new Date(endTime) > new Date(startTime)
    ? Math.ceil((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60))
    : 0;

  const totalPrice = totalHours * pricePerHour;

  // Validaciones en tiempo real
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!vehiclePlate.trim()) {
      errors.vehiclePlate = 'La patente es obligatoria';
    } else if (vehiclePlate.length < 4) {
      errors.vehiclePlate = 'La patente debe tener al menos 4 caracteres';
    }
    
    if (!startTime) {
      errors.startTime = 'Seleccioná una fecha y hora de inicio';
    } else {
      const start = new Date(startTime);
      const now = new Date();
      if (start < now) {
        errors.startTime = 'La fecha de inicio no puede ser en el pasado';
      }
    }
    
    if (!endTime) {
      errors.endTime = 'Seleccioná una fecha y hora de fin';
    } else if (startTime && new Date(endTime) <= new Date(startTime)) {
      errors.endTime = 'La fecha de fin debe ser posterior a la de inicio';
    }
    
    if (totalHours > 24) {
      errors.endTime = 'La reserva no puede exceder las 24 horas';
    }
    
    if (pricePerHour === 0 && rates.length > 0) {
      errors.vehicleType = 'No hay tarifa disponible para este tipo de vehículo';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Actualizar validaciones cuando cambian los campos
  useEffect(() => {
    if (startTime || endTime || vehiclePlate) {
      validateForm();
    }
  }, [vehicleType, vehiclePlate, startTime, endTime]);

  // Crear reserva
  const handleReserve = async () => {
    if (!user) {
      showError('Debés iniciar sesión para reservar');
      navigate('/');
      return;
    }

    if (availability.available === 0) {
      showError('Este estacionamiento no tiene lugares disponibles');
      return;
    }

    if (!validateForm()) {
      showError('Por favor, corregí los errores del formulario');
      return;
    }

    try {
      const reservationData = {
        parkingLotId: id!,
        vehicleType: vehicleType as UserVehicleType,
        vehiclePlate: vehiclePlate.toUpperCase().trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      };

      await createReservation(reservationData);
      showSuccess('¡Reserva creada exitosamente! Esperá la confirmación del estacionamiento.');
      
      // Redirigir a mis reservas después de 2 segundos
      setTimeout(() => {
        navigate('/client/my-reservations');
      }, 2000);
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
      van: 'Van',
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

            {/* TARIFAS */}
            <div className='bg-blue-50 rounded-2xl p-6'>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={20} className="text-blue-600" />
                <h2 className="text-xl font-semibold">Tarifas</h2>
              </div>
              {getRateDisplay()}
            </div>

            {/* RESUMEN DEL COSTO */}
            {totalHours > 0 && (
              <div className='bg-green-50 border border-green-200 rounded-2xl p-4 transition-all'>
                <h3 className='font-bold text-lg flex items-center gap-2'>
                  <CreditCard size={18} className="text-green-600" />
                  Resumen de la reserva
                </h3>
                <div className="mt-2 space-y-1">
                  <p className="text-gray-600">Horas: <span className="font-semibold">{totalHours}</span></p>
                  <p className="text-gray-600">Tarifa: <span className="font-semibold">${pricePerHour}/h</span></p>
                  <p className='font-semibold text-green-700 text-lg mt-2'>
                    Total estimado: ${totalPrice}
                  </p>
                </div>
              </div>
            )}

            {/* FORMULARIO DE RESERVA */}
            {availability.available === 0 ? (
              <div className='bg-red-100 border border-red-300 text-red-700 p-4 rounded-xl flex items-center gap-3'>
                <AlertCircle size={20} />
                <span>Este estacionamiento se encuentra completo actualmente.</span>
              </div>
            ) : (
              <>
                <h2 className='text-2xl font-bold flex items-center gap-2'>
                  <Calendar size={22} />
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
                      className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.vehicleType ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
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
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                        validationErrors.vehiclePlate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.vehiclePlate && (
                      <p className='text-red-500 text-xs mt-1'>{validationErrors.vehiclePlate}</p>
                    )}
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
                      className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.startTime ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.startTime && (
                      <p className='text-red-500 text-xs mt-1'>{validationErrors.startTime}</p>
                    )}
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
                      className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.endTime ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.endTime && (
                      <p className='text-red-500 text-xs mt-1'>{validationErrors.endTime}</p>
                    )}
                  </div>
                </div>

                {/* BOTÓN RESERVAR */}
                <button
                  onClick={handleReserve}
                  disabled={isCreatingReservation || availability.available === 0}
                  className={`py-4 rounded-xl font-semibold transition-all text-white flex items-center justify-center gap-2
                    ${availability.available > 0 && !isCreatingReservation
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
                      {availability.available > 0 ? 'Reservar espacio' : 'Sin disponibilidad'}
                    </>
                  )}
                </button>

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