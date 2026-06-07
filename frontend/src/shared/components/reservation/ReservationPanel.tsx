// // // shared/components/reservation/ReservationPanel.tsx
// // import { useEffect, useState } from 'react';
// // import { Check, X, Clock, AlertCircle } from 'lucide-react';
// // import { useReservationsStore } from '../../../stores/reservationStore';
// // import { useParkingLotsStore } from '../../../stores/parkingStore';
// // import { format } from 'date-fns';
// // import { es } from 'date-fns/locale';

// // function ReservationPanel() {
// //   const { currentParkingLot } = useParkingLotsStore();
// //   const { parkingReservations, fetchParkingReservations, confirmReservation, cancelByParking, isLoading } = useReservationsStore();
  
// //   const [selectedTab, setSelectedTab] = useState<'pending' | 'today' | 'upcoming'>('pending');

// //   useEffect(() => {
// //     if (currentParkingLot?.id) {
// //       fetchParkingReservations(currentParkingLot.id);
// //     }
// //   }, [currentParkingLot, fetchParkingReservations]);

// //   // Filtrar reservas según el tab seleccionado
// //   const pendingReservations = parkingReservations.filter(r => r.status === 'pending_confirmation');
  
// //   const todayReservations = parkingReservations.filter(r => {
// //     if (r.status !== 'confirmed') return false;
// //     const today = new Date().toDateString();
// //     return new Date(r.startTime).toDateString() === today;
// //   });
  
// //   const upcomingReservations = parkingReservations.filter(r => {
// //     if (r.status !== 'confirmed') return false;
// //     return new Date(r.startTime) > new Date();
// //   });

// //   const getReservationsToShow = () => {
// //     switch (selectedTab) {
// //       case 'pending': return pendingReservations;
// //       case 'today': return todayReservations;
// //       case 'upcoming': return upcomingReservations;
// //       default: return [];
// //     }
// //   };

// //   const handleConfirm = async (id: string) => {
// //     try {
// //       await confirmReservation(id);
// //     } catch (error) {
// //       console.error('Error al confirmar reserva:', error);
// //     }
// //   };

// //   const handleReject = async (id: string) => {
// //     if (confirm('¿Rechazar esta reserva?')) {
// //       try {
// //         await cancelByParking(id, 'Rechazada por el estacionamiento');
// //       } catch (error) {
// //         console.error('Error al rechazar reserva:', error);
// //       }
// //     }
// //   };

// //   const formatTime = (dateStr: string) => {
// //     return format(new Date(dateStr), 'HH:mm', { locale: es });
// //   };

// //   const formatDate = (dateStr: string) => {
// //     return format(new Date(dateStr), "dd/MM", { locale: es });
// //   };

// //   const isExpiringSoon = (reservation: any) => {
// //     if (!reservation.expiresAt) return false;
// //     const hoursLeft = (new Date(reservation.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60);
// //     return hoursLeft < 2 && hoursLeft > 0;
// //   };

// //   // Nombre del cliente (puede venir del backend o generarse)
// //   const getClientName = (reservation: any) => {
// //     if (reservation.clientName) return reservation.clientName;
// //     // Fallback: generar nombre basado en ID
// //     const names = ['Juan Pérez', 'María Gómez', 'Carlos Ruiz', 'Ana López', 'Pedro Fernández'];
// //     const index = reservation.id?.charCodeAt(0) % names.length || 0;
// //     return names[index];
// //   };

// //   if (isLoading && parkingReservations.length === 0) {
// //     return (
// //       <div className="w-2/6 rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px] flex items-center justify-center">
// //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="w-2/6 rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px] flex flex-col">
// //       <h2 className="text-lg font-semibold text-slate-800 mb-4">
// //         Solicitudes de Reserva
// //       </h2>

// //       {/* Tabs */}
// //       <div className="flex gap-2 border-b border-slate-200 mb-4">
// //         <button
// //           onClick={() => setSelectedTab('pending')}
// //           className={`px-3 py-2 text-sm font-medium transition-all ${
// //             selectedTab === 'pending'
// //               ? 'text-blue-600 border-b-2 border-blue-600'
// //               : 'text-slate-500 hover:text-slate-700'
// //           }`}
// //         >
// //           Pendientes ({pendingReservations.length})
// //         </button>
// //         <button
// //           onClick={() => setSelectedTab('today')}
// //           className={`px-3 py-2 text-sm font-medium transition-all ${
// //             selectedTab === 'today'
// //               ? 'text-blue-600 border-b-2 border-blue-600'
// //               : 'text-slate-500 hover:text-slate-700'
// //           }`}
// //         >
// //           Hoy ({todayReservations.length})
// //         </button>
// //         <button
// //           onClick={() => setSelectedTab('upcoming')}
// //           className={`px-3 py-2 text-sm font-medium transition-all ${
// //             selectedTab === 'upcoming'
// //               ? 'text-blue-600 border-b-2 border-blue-600'
// //               : 'text-slate-500 hover:text-slate-700'
// //           }`}
// //         >
// //           Próximas ({upcomingReservations.length})
// //         </button>
// //       </div>

// //       <div className="space-y-4 overflow-y-auto max-h-[500px]">
// //         {getReservationsToShow().map((reservation) => (
// //           <div
// //             key={reservation.id}
// //             className="border border-slate-200 rounded-xl p-4 shadow-sm"
// //           >
// //             <div className="flex items-center gap-3">
// //               <img
// //                 src={`https://i.pravatar.cc/100?img=${reservation.id?.charCodeAt(0) || 1}`}
// //                 alt={getClientName(reservation)}
// //                 className="w-14 h-14 rounded-full object-cover"
// //               />
// //               <div>
// //                 <h3 className="font-semibold text-slate-800">
// //                   {getClientName(reservation)}
// //                 </h3>
// //                 <p className="text-sm text-slate-500 capitalize">
// //                   {reservation.vehicleType}
// //                 </p>
// //               </div>
// //             </div>

// //             <div className="mt-4 space-y-1 text-sm text-slate-600">
// //               <p>
// //                 Inicio:
// //                 <span className="font-medium ml-1">
// //                   {formatTime(reservation.startTime)}
// //                 </span>
// //               </p>
// //               <p>
// //                 Fin:
// //                 <span className="font-medium ml-1">
// //                   {formatTime(reservation.endTime)}
// //                 </span>
// //               </p>
// //               <p>
// //                 Espacio:
// //                 <span className="font-medium ml-1">
// //                   {reservation.spaceNumber}
// //                 </span>
// //               </p>
// //               <p>
// //                 Patente:
// //                 <span className="font-mono ml-1">
// //                   {reservation.vehiclePlate}
// //                 </span>
// //               </p>
// //               {reservation.totalAmount && (
// //                 <p>
// //                   Monto:
// //                   <span className="font-medium ml-1">
// //                     ${reservation.totalAmount}
// //                   </span>
// //                 </p>
// //               )}
// //             </div>

// //             {isExpiringSoon(reservation) && (
// //               <div className="mt-2 flex items-center gap-1 text-amber-600 text-xs">
// //                 <Clock size={12} />
// //                 <span>Expira pronto</span>
// //               </div>
// //             )}

// //             {selectedTab === 'pending' && (
// //               <div className="mt-4 flex gap-2">
// //                 <button
// //                   onClick={() => handleConfirm(reservation.id)}
// //                   className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm transition"
// //                 >
// //                   <Check size={16} />
// //                   Aprobar
// //                 </button>
// //                 <button
// //                   onClick={() => handleReject(reservation.id)}
// //                   className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition"
// //                 >
// //                   <X size={16} />
// //                   Rechazar
// //                 </button>
// //               </div>
// //             )}

// //             {selectedTab === 'today' && reservation.status === 'confirmed' && (
// //               <div className="mt-4">
// //                 <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
// //                   <Check size={12} />
// //                   Confirmada
// //                 </span>
// //               </div>
// //             )}
// //           </div>
// //         ))}

// //         {getReservationsToShow().length === 0 && !isLoading && (
// //           <div className="text-center py-8 text-slate-500">
// //             <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
// //             <p>No hay reservas {selectedTab === 'pending' ? 'pendientes' : selectedTab === 'today' ? 'para hoy' : 'próximas'}</p>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // }

// // export default ReservationPanel;

// // shared/components/reservation/ReservationPanel.tsx
// import { useEffect, useState } from 'react';
// import { Check, X, Clock, AlertCircle } from 'lucide-react';
// import { useReservationsStore } from '../../../stores/reservationStore';
// import { useParkingLotsStore } from '../../../stores/parkingStore';
// import { format } from 'date-fns';
// import { es } from 'date-fns/locale';

// interface ReservationPanelProps {
//   className?: string;
// }

// function ReservationPanel({ className = '' }: ReservationPanelProps) {
//   const { currentParkingLot } = useParkingLotsStore();
//   const { parkingReservations, fetchParkingReservations, confirmReservation, cancelByParking, isLoading } = useReservationsStore();
//   const [selectedTab, setSelectedTab] = useState<'pending' | 'today' | 'upcoming'>('pending');

//   useEffect(() => {
//     if (currentParkingLot?.id) {
//       fetchParkingReservations(currentParkingLot.id);
//     }
//   }, [currentParkingLot, fetchParkingReservations]);

//   const pendingReservations = parkingReservations.filter(r => r.status === 'pending_confirmation');
//   const todayReservations = parkingReservations.filter(r => {
//     if (r.status !== 'confirmed') return false;
//     const today = new Date().toDateString();
//     return new Date(r.startTime).toDateString() === today;
//   });
//   const upcomingReservations = parkingReservations.filter(r => {
//     if (r.status !== 'confirmed') return false;
//     return new Date(r.startTime) > new Date();
//   });

//   const getReservationsToShow = () => {
//     switch (selectedTab) {
//       case 'pending': return pendingReservations;
//       case 'today': return todayReservations;
//       case 'upcoming': return upcomingReservations;
//       default: return [];
//     }
//   };

//   const handleConfirm = async (id: string) => {
//     try {
//       await confirmReservation(id);
//     } catch (error) {
//       console.error('Error al confirmar reserva:', error);
//     }
//   };

//   const handleReject = async (id: string) => {
//     if (confirm('¿Rechazar esta reserva?')) {
//       try {
//         await cancelByParking(id, 'Rechazada por el estacionamiento');
//       } catch (error) {
//         console.error('Error al rechazar reserva:', error);
//       }
//     }
//   };

//   const formatTime = (dateStr: string) => format(new Date(dateStr), 'HH:mm', { locale: es });
//   const formatDate = (dateStr: string) => format(new Date(dateStr), "dd/MM", { locale: es });

//   const isExpiringSoon = (reservation: any) => {
//     if (!reservation.expiresAt) return false;
//     const hoursLeft = (new Date(reservation.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60);
//     return hoursLeft < 2 && hoursLeft > 0;
//   };

//   const getClientName = (reservation: any) => {
//     if (reservation.clientName) return reservation.clientName;
//     const names = ['Juan Pérez', 'María Gómez', 'Carlos Ruiz', 'Ana López', 'Pedro Fernández'];
//     const index = reservation.id?.charCodeAt(0) % names.length || 0;
//     return names[index];
//   };

//   if (isLoading && parkingReservations.length === 0) {
//     return (
//       <div className={`rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px] flex items-center justify-center ${className}`}>
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   return (
//     <div className={`rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px] flex flex-col ${className}`}>
//       <h2 className="text-lg font-semibold text-slate-800 mb-4">Solicitudes de Reserva</h2>

//       {/* Tabs responsivos */}
//       <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-4">
//         <button
//           onClick={() => setSelectedTab('pending')}
//           className={`px-3 py-2 text-sm font-medium transition-all ${
//             selectedTab === 'pending'
//               ? 'text-blue-600 border-b-2 border-blue-600'
//               : 'text-slate-500 hover:text-slate-700'
//           }`}
//         >
//           Pendientes ({pendingReservations.length})
//         </button>
//         <button
//           onClick={() => setSelectedTab('today')}
//           className={`px-3 py-2 text-sm font-medium transition-all ${
//             selectedTab === 'today'
//               ? 'text-blue-600 border-b-2 border-blue-600'
//               : 'text-slate-500 hover:text-slate-700'
//           }`}
//         >
//           Hoy ({todayReservations.length})
//         </button>
//         <button
//           onClick={() => setSelectedTab('upcoming')}
//           className={`px-3 py-2 text-sm font-medium transition-all ${
//             selectedTab === 'upcoming'
//               ? 'text-blue-600 border-b-2 border-blue-600'
//               : 'text-slate-500 hover:text-slate-700'
//           }`}
//         >
//           Próximas ({upcomingReservations.length})
//         </button>
//       </div>

//       <div className="space-y-4 overflow-y-auto max-h-[500px]">
//         {getReservationsToShow().map((reservation) => (
//           <div key={reservation.id} className="border border-slate-200 rounded-xl p-3 shadow-sm">
//             <div className="flex items-center gap-3">
//               <img
//                 src={`https://i.pravatar.cc/100?img=${reservation.id?.charCodeAt(0) || 1}`}
//                 alt={getClientName(reservation)}
//                 className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover"
//               />
//               <div>
//                 <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
//                   {getClientName(reservation)}
//                 </h3>
//                 <p className="text-xs sm:text-sm text-slate-500 capitalize">{reservation.vehicleType}</p>
//               </div>
//             </div>

//             <div className="mt-3 space-y-1 text-xs sm:text-sm text-slate-600">
//               <p>
//                 Inicio: <span className="font-medium ml-1">{formatTime(reservation.startTime)}</span>
//               </p>
//               <p>
//                 Fin: <span className="font-medium ml-1">{formatTime(reservation.endTime)}</span>
//               </p>
//               <p>
//                 Espacio: <span className="font-medium ml-1">{reservation.spaceNumber}</span>
//               </p>
//               <p>
//                 Patente: <span className="font-mono ml-1">{reservation.vehiclePlate}</span>
//               </p>
//               {reservation.totalAmount && (
//                 <p>
//                   Monto: <span className="font-medium ml-1">${reservation.totalAmount}</span>
//                 </p>
//               )}
//             </div>

//             {isExpiringSoon(reservation) && (
//               <div className="mt-2 flex items-center gap-1 text-amber-600 text-xs">
//                 <Clock size={12} />
//                 <span>Expira pronto</span>
//               </div>
//             )}

//             {selectedTab === 'pending' && (
//               <div className="mt-4 flex gap-2">
//                 <button
//                   onClick={() => handleConfirm(reservation.id)}
//                   className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm transition"
//                 >
//                   <Check size={16} /> Aprobar
//                 </button>
//                 <button
//                   onClick={() => handleReject(reservation.id)}
//                   className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition"
//                 >
//                   <X size={16} /> Rechazar
//                 </button>
//               </div>
//             )}

//             {selectedTab === 'today' && reservation.status === 'confirmed' && (
//               <div className="mt-4">
//                 <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
//                   <Check size={12} /> Confirmada
//                 </span>
//               </div>
//             )}
//           </div>
//         ))}

//         {getReservationsToShow().length === 0 && !isLoading && (
//           <div className="text-center py-8 text-slate-500">
//             <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
//             <p>No hay reservas {selectedTab === 'pending' ? 'pendientes' : selectedTab === 'today' ? 'para hoy' : 'próximas'}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default ReservationPanel;

// shared/components/reservation/ReservationPanel.tsx
import { useEffect, useState } from 'react';
import { Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useReservationsStore } from '../../../stores/reservationStore';
import { useParkingLotsStore } from '../../../stores/parkingStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationPanelProps {
  className?: string;
}

function ReservationPanel({ className = '' }: ReservationPanelProps) {
  const { currentParkingLot } = useParkingLotsStore();
  const { parkingReservations, fetchParkingReservations, confirmReservation, cancelByParking, isLoading } = useReservationsStore();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'today' | 'upcoming'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null); // Para loader individual

  useEffect(() => {
    if (currentParkingLot?.id) {
      fetchParkingReservations(currentParkingLot.id);
    }
  }, [currentParkingLot, fetchParkingReservations]);

  const pendingReservations = parkingReservations.filter(r => r.status === 'pending_confirmation');
  const todayReservations = parkingReservations.filter(r => {
    if (r.status !== 'confirmed') return false;
    const today = new Date().toDateString();
    return new Date(r.startTime).toDateString() === today;
  });
  const upcomingReservations = parkingReservations.filter(r => {
    if (r.status !== 'confirmed') return false;
    return new Date(r.startTime) > new Date();
  });

  const getReservationsToShow = () => {
    switch (selectedTab) {
      case 'pending': return pendingReservations;
      case 'today': return todayReservations;
      case 'upcoming': return upcomingReservations;
      default: return [];
    }
  };

  const handleConfirm = async (id: string) => {
    setActionLoadingId(id);
    try {
      await confirmReservation(id);
    } catch (error) {
      console.error('Error al confirmar reserva:', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('¿Rechazar esta reserva?')) {
      setActionLoadingId(id);
      try {
        await cancelByParking(id, 'Rechazada por el estacionamiento');
      } catch (error) {
        console.error('Error al rechazar reserva:', error);
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const formatTime = (dateStr: string) => format(new Date(dateStr), 'HH:mm', { locale: es });
  const formatDate = (dateStr: string) => format(new Date(dateStr), "dd/MM", { locale: es });

  const isExpiringSoon = (reservation: any) => {
    if (!reservation.expiresAt) return false;
    const hoursLeft = (new Date(reservation.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursLeft < 2 && hoursLeft > 0;
  };

  const getClientName = (reservation: any) => {
    if (reservation.clientName) return reservation.clientName;
    const names = ['Juan Pérez', 'María Gómez', 'Carlos Ruiz', 'Ana López', 'Pedro Fernández'];
    const index = reservation.id?.charCodeAt(0) % names.length || 0;
    return names[index];
  };

  if (isLoading && parkingReservations.length === 0) {
    return (
      <div className={`rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px] flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px] flex flex-col ${className}`}>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Solicitudes de Reserva</h2>

      {/* Tabs responsivos */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-4">
        <button
          onClick={() => setSelectedTab('pending')}
          className={`px-3 py-2 text-sm font-medium transition-all ${
            selectedTab === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pendientes ({pendingReservations.length})
        </button>
        <button
          onClick={() => setSelectedTab('today')}
          className={`px-3 py-2 text-sm font-medium transition-all ${
            selectedTab === 'today'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Hoy ({todayReservations.length})
        </button>
        <button
          onClick={() => setSelectedTab('upcoming')}
          className={`px-3 py-2 text-sm font-medium transition-all ${
            selectedTab === 'upcoming'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Próximas ({upcomingReservations.length})
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto max-h-[500px]">
        {getReservationsToShow().map((reservation) => (
          <div key={reservation.id} className="border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <img
                src={`https://i.pravatar.cc/100?img=${reservation.id?.charCodeAt(0) || 1}`}
                alt={getClientName(reservation)}
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
                  {getClientName(reservation)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 capitalize">{reservation.vehicleType}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs sm:text-sm text-slate-600">
              <p>
                Inicio: <span className="font-medium ml-1">{formatTime(reservation.startTime)}</span>
              </p>
              <p>
                Fin: <span className="font-medium ml-1">{formatTime(reservation.endTime)}</span>
              </p>
              <p>
                Espacio: <span className="font-medium ml-1">{reservation.spaceNumber}</span>
              </p>
              <p>
                Patente: <span className="font-mono ml-1">{reservation.vehiclePlate}</span>
              </p>
              {reservation.totalAmount && (
                <p>
                  Monto: <span className="font-medium ml-1">${reservation.totalAmount}</span>
                </p>
              )}
            </div>

            {isExpiringSoon(reservation) && (
              <div className="mt-2 flex items-center gap-1 text-amber-600 text-xs">
                <Clock size={12} />
                <span>Expira pronto</span>
              </div>
            )}

            {selectedTab === 'pending' && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleConfirm(reservation.id)}
                  disabled={actionLoadingId === reservation.id}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm transition disabled:opacity-50"
                >
                  {actionLoadingId === reservation.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Aprobar
                </button>
                <button
                  onClick={() => handleReject(reservation.id)}
                  disabled={actionLoadingId === reservation.id}
                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition disabled:opacity-50"
                >
                  {actionLoadingId === reservation.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Rechazar
                </button>
              </div>
            )}

            {selectedTab === 'today' && reservation.status === 'confirmed' && (
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  <Check size={12} /> Confirmada
                </span>
              </div>
            )}
          </div>
        ))}

        {getReservationsToShow().length === 0 && !isLoading && (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
            <p>No hay reservas {selectedTab === 'pending' ? 'pendientes' : selectedTab === 'today' ? 'para hoy' : 'próximas'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReservationPanel;