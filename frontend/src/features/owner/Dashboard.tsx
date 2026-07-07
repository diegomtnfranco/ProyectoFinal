import { useEffect, useRef } from 'react';
import { CarFront, Motorbike, ParkingMeter, Van, CalendarCheck } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWebsocketStore } from '../../stores/websocketStore';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { useSpacesStore } from '../../stores/spacesStore';
import { useOccupancyStore } from '../../stores/occupancyStore';
import { useReservationsStore } from '../../stores/reservationStore';
import { VehicleType, SpaceStatus } from '../../types/auth.types';
import ParkingMap from '../../shared/components/parking/ParkingMap';
import ReservationPanel from '../../shared/components/reservation/ReservationPanel';
import { NoParkingMessage } from '../../shared/components/common/NoParkingMessage';
import { useState } from 'react';
import { DownloadTicketModal } from '../../shared/components/tickets/DownloadTicketModal';
import { generateTicketPDF } from '../../shared/utils/GenerateTicketPDF';

const DashboardOwner: React.FC = () => {
  const { token } = useAuthStore();
  const { connect, disconnect, subscribe, unsubscribe, isConnected } = useWebsocketStore();
  const { currentParkingLot, fetchMyParkingLot, isLoading: parkingLoading } = useParkingLotsStore();
  const { spaces, fetchSpaces, isLoading: spacesLoading } = useSpacesStore();
  const { activeOccupancies, fetchActiveOccupancies } = useOccupancyStore();
  const { fetchParkingReservations } = useReservationsStore();
  const [showTicketModal, setShowTicketModal] = useState(false);
const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    fetchMyParkingLot();
  }, [fetchMyParkingLot]);

  const hasConnected = useRef(false);
  useEffect(() => {
    if (token && !hasConnected.current) {
      hasConnected.current = true;
      connect(token);
    }
    return () => {
      // No desconectar al salir del componente
    };
  }, [token, connect]);

  useEffect(() => {
    if (currentParkingLot?.id) {
      fetchSpaces(currentParkingLot.id);
      fetchActiveOccupancies(currentParkingLot.id);
      fetchParkingReservations(currentParkingLot.id);
    }
  }, [currentParkingLot, fetchSpaces, fetchActiveOccupancies, fetchParkingReservations]);

  useEffect(() => {
    if (!isConnected || !currentParkingLot?.id) return;

    const handleReservationUpdate = () => {
      fetchParkingReservations(currentParkingLot.id);
    };
    const handleSpaceUpdate = (data?: any) => {
      console.log('📡 space:update recibido:', data);
      if (currentParkingLot?.id) {
        fetchSpaces(currentParkingLot.id);
        fetchActiveOccupancies(currentParkingLot.id);
      }
    };
    const handleOccupancyUpdate = () => {
      fetchActiveOccupancies(currentParkingLot.id);
      fetchSpaces(currentParkingLot.id);
    };

    subscribe('reservation:new', handleReservationUpdate);
    subscribe('reservation:confirmed', handleReservationUpdate);
    subscribe('reservation:cancelled', handleReservationUpdate);
    subscribe('space:update', handleSpaceUpdate);
    subscribe('occupancy:update', handleOccupancyUpdate);

    return () => {
      unsubscribe('reservation:new', handleReservationUpdate);
      unsubscribe('reservation:confirmed', handleReservationUpdate);
      unsubscribe('reservation:cancelled', handleReservationUpdate);
      unsubscribe('space:update', handleSpaceUpdate);
      unsubscribe('occupancy:update', handleOccupancyUpdate);
    };
  }, [isConnected, currentParkingLot, subscribe, unsubscribe, fetchParkingReservations, fetchSpaces, fetchActiveOccupancies]);

  const spacesByVehicleType = () => {
    const occupiedByType: Record<string, number> = {
      [VehicleType.CAR]: 0,
      [VehicleType.TRUCK]: 0,
      [VehicleType.MOTORCYCLE]: 0,
      [VehicleType.VAN]: 0,
    };
    const availableSpaces = spaces.filter(s => s.status === SpaceStatus.AVAILABLE).length;
    spaces.forEach(space => {
      if (space.status === SpaceStatus.OCCUPIED && space.occupiedByVehicleType) {
        occupiedByType[space.occupiedByVehicleType]++;
      }
    });
    return { occupiedByType, availableSpaces };
  };

  const { occupiedByType, availableSpaces } = spacesByVehicleType();
  const totalSpaces = spaces.length;
  const activeReservationsCount = activeOccupancies.filter(o => o.hasReservation === true).length;
  const reservationCount = activeReservationsCount;

  const handleManualCheckout = (result: any) => {
  console.log("DASHBOARD RECIBE", result);

  if (!result) return;

  setTicketData(result);
  setShowTicketModal(true);
};

const handleDownloadTicket = () => {
   console.log("TICKET DATA", ticketData);
     console.log("OCCUPANCY", ticketData.occupancy);
  console.log("PARKING LOT", ticketData.occupancy.space.parkingLot);
  if (!ticketData) return;

   // Calcular duración
  const checkIn = new Date(ticketData.occupancy.checkInTime);
  const checkOut = new Date(ticketData.occupancy.checkOutTime);

  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  const duration =
    diffMinutes >= 60
      ? `${(diffMinutes / 60).toFixed(1)} horas`
      : `${diffMinutes} minutos`;


  generateTicketPDF({
  ticketNumber: Date.now().toString(),

  parkingLot: ticketData.occupancy.space.parkingLot,

  vehiclePlate: ticketData.occupancy.vehiclePlate,

  checkInTime: ticketData.occupancy.checkInTime,

  checkOutTime: ticketData.occupancy.checkOutTime,

  duration, 

  pricePerHour: Number(ticketData.rate.pricePerHour),

  totalAmount: ticketData.occupancy.totalAmount,

  isAnonymous: ticketData.occupancy.isAnonymous,
});

  setShowTicketModal(false);
};

  if (parkingLoading || spacesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando estacionamiento...</p>
        </div>
      </div>
    );
  }

  if (!currentParkingLot) {
    return (
     <NoParkingMessage
             variant="info"
             title="Error al cargar el estacionamiento"
             message={'No tienes ningún estacionamiento registrado'}
             
           />
    );
  }

  return (
    <div className="space-y-6 flex-col w-full h-full">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{currentParkingLot.name}</h1>
          <p className="text-sm text-gray-500">{currentParkingLot.address}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-gray-500">
            {currentParkingLot.openTime} - {currentParkingLot.closeTime}
          </p>
        </div>
      </div>

      {/* Tarjetas de estadísticas - grid responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
        {/* Autos ocupados */}
        <div className="rounded-md flex gap-1 shadow-sm bg-white p-2">
          <div className="bg-blue-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center">
            <CarFront size={28} className="text-blue-500" />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Autos</p>
            <span className="font-semibold text-lg">{occupiedByType[VehicleType.CAR]}</span>
            <p className="text-xs text-slate-500">ocupados</p>
          </div>
        </div>

        {/* Motos ocupadas */}
        <div className="rounded-md flex gap-1 bg-white shadow-sm p-2">
          <div className="bg-green-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center">
            <Motorbike size={28} className="text-green-800" />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Motos</p>
            <span className="font-semibold text-lg">{occupiedByType[VehicleType.MOTORCYCLE]}</span>
            <p className="text-xs text-slate-500">ocupadas</p>
          </div>
        </div>

        {/* Camionetas ocupadas */}
        <div className="rounded-md flex gap-1 bg-white shadow-sm p-2">
          <div className="bg-orange-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center">
            <Van size={28} className="text-orange-800" />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Camionetas</p>
            <span className="font-semibold text-lg">{occupiedByType[VehicleType.TRUCK]}</span>
            <p className="text-xs text-slate-500">ocupadas</p>
          </div>
        </div>

        {/* Reservas activas */}
        <div className="rounded-md flex gap-1 bg-white shadow-sm p-2">
          <div className="bg-violet-500 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center">
            <CalendarCheck size={28} className="text-white" />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Reservas</p>
            <span className="font-semibold text-lg">{reservationCount}</span>
            <p className="text-xs text-slate-500">activas</p>
          </div>
        </div>

        {/* Espacios disponibles */}
        <div className="rounded-md flex gap-1 bg-white shadow-sm p-2">
          <div className="bg-slate-200 mx-auto p-2 w-1/3 rounded-l-md flex items-center justify-center">
            <ParkingMeter size={28} className="text-slate-500" />
          </div>
          <div className="flex-col w-2/3 text-xs p-1">
            <p className="text-slate-500">Disponibles</p>
            <span className="font-semibold text-lg">{availableSpaces}</span>
            <p className="text-xs text-slate-500">de {totalSpaces}</p>
          </div>
        </div>
      </div>

      {/* Mapa y panel de reservas - responsive: columna en mobile, fila en desktop */}
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        <ParkingMap
          spacesList={spaces}
          parkingLotId={currentParkingLot.id}
          onRefresh={() => {
            fetchSpaces(currentParkingLot.id);
            fetchActiveOccupancies(currentParkingLot.id);
          }}
          onManualCheckout={handleManualCheckout}
          className="w-full lg:w-4/6"
/>
        <ReservationPanel className="w-full lg:w-2/6" />

        <DownloadTicketModal
            isOpen={showTicketModal}
            onClose={() => setShowTicketModal(false)}
            onDownload={handleDownloadTicket}
        />
      </div>
    </div>
  );
};

export default DashboardOwner;