// frontend/src/features/parking-lots/pages/MyReservationsPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Car, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock3,
  CreditCard,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Trash2,
  Eye
} from 'lucide-react';
import { useReservationsStore } from '../../../stores/reservationStore';
import { useWebsocketStore } from '../../../stores/websocketStore';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../shared/hooks/useToast';
import { ReservationStatus, type ReservationStatusType } from '../../../types/auth.types';
import type { Reservation } from '../../../types/parking.types';

type FilterPeriod = 'all' | 'upcoming' | 'past' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

function MyReservationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myReservations, isLoading, totalSpent, fetchMyReservations, cancelReservation, updateReservationStatus } = useReservationsStore();
  const { isConnected, subscribe, unsubscribe } = useWebsocketStore();
  const { showSuccess, showError, showInfo } = useToast();

  // Estados de filtro
  const [filterStatus, setFilterStatus] = useState<FilterPeriod>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [expandedReservation, setExpandedReservation] = useState<string | null>(null);

  // Cargar reservas al montar
  useEffect(() => {
    if (user) {
      fetchMyReservations();
    }
  }, [user, fetchMyReservations]);

  // Suscribirse a WebSockets para actualizaciones en tiempo real
  useEffect(() => {
    if (!isConnected) return;

    const handleReservationUpdate = (data: any) => {
      console.log('📡 Reserva actualizada:', data);
      if (data?.id && data?.status) {
        updateReservationStatus(data.id, data.status);
        showInfo(`Tu reserva ha sido ${data.status === 'confirmed' ? 'confirmada' : 'actualizada'}`);
        fetchMyReservations(); // Recargar para obtener datos actualizados
      }
    };

    const handleReservationConfirmed = (data: any) => {
      console.log('✅ Reserva confirmada:', data);
      showSuccess(`¡Tu reserva para el espacio ${data.spaceNumber} ha sido confirmada!`);
      fetchMyReservations();
    };

    const handleReservationCancelled = (data: any) => {
      console.log('❌ Reserva cancelada:', data);
      if (data?.cancelledBy === 'parking') {
        showError(`Tu reserva fue cancelada por el estacionamiento${data.reason ? `: ${data.reason}` : ''}`);
      }
      fetchMyReservations();
    };

    subscribe('reservation:confirmed', handleReservationConfirmed);
    subscribe('reservation:cancelled', handleReservationCancelled);
    subscribe('reservation:update', handleReservationUpdate);

    return () => {
      unsubscribe('reservation:confirmed', handleReservationConfirmed);
      unsubscribe('reservation:cancelled', handleReservationCancelled);
      unsubscribe('reservation:update', handleReservationUpdate);
    };
  }, [isConnected, subscribe, unsubscribe, updateReservationStatus, fetchMyReservations, showSuccess, showError, showInfo]);

  // Filtrar reservas
  const getFilteredReservations = useCallback(() => {
    let filtered = [...myReservations];

    // Filtrar por estado/periodo
    const now = new Date();
    switch (filterStatus) {
      case 'upcoming':
        filtered = filtered.filter(r => new Date(r.startTime) > now && r.status !== 'cancelled_by_client' && r.status !== 'cancelled_by_parking');
        break;
      case 'past':
        filtered = filtered.filter(r => new Date(r.endTime) < now || r.status === 'completed');
        break;
      case 'pending':
        filtered = filtered.filter(r => r.status === 'pending_confirmation');
        break;
      case 'confirmed':
        filtered = filtered.filter(r => r.status === 'confirmed');
        break;
      case 'cancelled':
        filtered = filtered.filter(r => r.status === 'cancelled_by_client' || r.status === 'cancelled_by_parking');
        break;
      case 'completed':
        filtered = filtered.filter(r => r.status === 'completed');
        break;
      default:
        break;
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.parkingLotName?.toLowerCase().includes(term) ||
        r.vehiclePlate.toLowerCase().includes(term)
      );
    }

    // Filtrar por rango de fechas
    if (dateRange.start) {
      const start = new Date(dateRange.start);
      filtered = filtered.filter(r => new Date(r.startTime) >= start);
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      filtered = filtered.filter(r => new Date(r.endTime) <= end);
    }

    // Ordenar por fecha (más reciente primero)
    return filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [myReservations, filterStatus, searchTerm, dateRange]);

  // Cancelar reserva
  const handleCancelReservation = async (id: string) => {
    if (!confirm('¿Estás seguro de que querés cancelar esta reserva?')) return;
    
    setCancellingId(id);
    try {
      await cancelReservation(id);
      showSuccess('Reserva cancelada exitosamente');
    } catch (error) {
      showError('Error al cancelar la reserva');
    } finally {
      setCancellingId(null);
    }
  };

  // Ver detalle de reserva
  const handleViewDetails = (id: string) => {
    navigate(`/client/reservations/${id}`);
  };

  // Obtener estado de la reserva con estilo
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      pending_confirmation: { 
        label: 'Pendiente', 
        icon: <Clock3 size={14} />, 
        color: 'bg-yellow-100 text-yellow-700' 
      },
      confirmed: { 
        label: 'Confirmada', 
        icon: <CheckCircle size={14} />, 
        color: 'bg-green-100 text-green-700' 
      },
      cancelled_by_client: { 
        label: 'Cancelada por ti', 
        icon: <XCircle size={14} />, 
        color: 'bg-red-100 text-red-700' 
      },
      cancelled_by_parking: { 
        label: 'Cancelada por el parking', 
        icon: <XCircle size={14} />, 
        color: 'bg-red-100 text-red-700' 
      },
      completed: { 
        label: 'Completada', 
        icon: <CheckCircle size={14} />, 
        color: 'bg-blue-100 text-blue-700' 
      },
      expired: { 
        label: 'Expirada', 
        icon: <AlertCircle size={14} />, 
        color: 'bg-gray-100 text-gray-700' 
      },
    };
    
    const config = statusConfig[status] || statusConfig.pending_confirmation;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  // Formatea montos en pesos argentinos con separador de miles
const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount));
};



  const filteredReservations = getFilteredReservations();
  const upcomingCount = myReservations.filter(r => new Date(r.startTime) > new Date() && r.status !== 'cancelled_by_client' && r.status !== 'cancelled_by_parking').length;
  const pendingCount = myReservations.filter(r => r.status === 'pending_confirmation').length;

  if (!user) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
        <div className='bg-white rounded-3xl shadow-xl p-8 max-w-md text-center'>
          <AlertCircle size={64} className='text-red-500 mx-auto mb-4' />
          <h2 className='text-2xl font-bold mb-2'>Acceso restringido</h2>
          <p className='text-gray-600 mb-6'>Debés iniciar sesión para ver tus reservas</p>
          <button
            onClick={() => navigate('/')}
            className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all'
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      <main className='max-w-6xl mx-auto p-6'>
        {/* Encabezado */}
        <div className='flex justify-between items-center mb-6 flex-wrap gap-4'>
          <div>
            <h1 className='text-3xl font-bold'>Mis Reservas</h1>
            <p className='text-gray-500 mt-1'>Gestioná todas tus reservas de estacionamiento</p>
          </div>
          
          {/* Estadísticas rápidas */}
          <div className='flex gap-3'>
            <div className='bg-white rounded-xl px-4 py-2 shadow-sm text-center'>
              <p className='text-2xl font-bold text-blue-600'>{upcomingCount}</p>
              <p className='text-xs text-gray-500'>Próximas</p>
            </div>
            <div className='bg-white rounded-xl px-4 py-2 shadow-sm text-center'>
              <p className='text-2xl font-bold text-yellow-600'>{pendingCount}</p>
              <p className='text-xs text-gray-500'>Pendientes</p>
            </div>
            <div className='bg-green-50 rounded-xl px-4 py-2 shadow-sm text-center'>
              <p className='text-2xl font-bold text-green-600'>
  {formatCurrency(totalSpent)}
</p>
              <p className='text-xs text-gray-500'>Total gastado</p>
            </div>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className='bg-white rounded-2xl shadow-sm p-4 mb-6'>
          <div className='flex flex-wrap gap-3 items-center justify-between'>
            <div className='flex flex-wrap gap-2'>
              <button
                onClick={() => setFilterStatus('upcoming')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === 'upcoming' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Próximas
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === 'pending' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFilterStatus('confirmed')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === 'confirmed' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Confirmadas
              </button>
              <button
                onClick={() => setFilterStatus('past')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === 'past' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Historial
              </button>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Filter size={18} />
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className='mt-4 pt-4 border-t border-gray-100'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div className='relative'>
                  <Search size={18} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                  <input
                    type='text'
                    placeholder='Buscar por estacionamiento o patente...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
                <div className='flex gap-2'>
                  <input
                    type='date'
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className='flex-1 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Desde'
                  />
                  <input
                    type='date'
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className='flex-1 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Hasta'
                  />
                </div>
              </div>
              {(dateRange.start || dateRange.end || searchTerm) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDateRange({ start: '', end: '' });
                  }}
                  className='mt-3 text-sm text-blue-600 hover:text-blue-700'
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Estado de conexión WebSocket */}
        <div className='flex justify-end items-center text-sm mb-4'>
          <div className='flex items-center gap-2'>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
            <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
              {isConnected ? 'Actualizaciones en tiempo real' : 'Conectando...'}
            </span>
          </div>
        </div>

        {/* Lista de reservas */}
        {isLoading && myReservations.length === 0 ? (
          <div className='flex items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className='bg-white rounded-2xl shadow-sm p-12 text-center'>
            <Calendar size={48} className='mx-auto text-gray-300 mb-4' />
            <h3 className='text-lg font-medium text-gray-600'>No hay reservas</h3>
            <p className='text-gray-400 mt-1'>
              {filterStatus === 'upcoming' 
                ? 'No tenés reservas próximas. ¡Buscá un estacionamiento para reservar!'
                : 'No hay reservas que coincidan con los filtros seleccionados'}
            </p>
            {filterStatus === 'upcoming' && (
              <button
                onClick={() => navigate('/client')}
                className='mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-colors'
              >
                Buscar estacionamiento
              </button>
            )}
          </div>
        ) : (
          <div className='space-y-4'>
            {filteredReservations.map((reservation) => (
              <div
                key={reservation.id}
                className='bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden'
              >
                <div className='p-5'>
                  <div className='flex flex-wrap justify-between items-start gap-4'>
                    {/* Información principal */}
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 flex-wrap mb-2'>
                        <h3 className='text-lg font-bold'>{reservation.parkingLotName}</h3>
                        {getStatusBadge(reservation.status)}
                      </div>
                      
                      <div className='grid sm:grid-cols-2 gap-2 mt-3 text-sm text-gray-600'>
                        <div className='flex items-center gap-2'>
                          <Calendar size={16} className='text-gray-400' />
                          <span>Inicio: {formatDate(reservation.startTime)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Clock size={16} className='text-gray-400' />
                          <span>Fin: {formatDate(reservation.endTime)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Car size={16} className='text-gray-400' />
                          <span>Vehículo: {reservation.vehiclePlate} ({reservation.vehicleType})</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <MapPin size={16} className='text-gray-400' />
                          <span>Espacio: {reservation.spaceNumber || 'Por asignar'}</span>
                        </div>
                      </div>
                      
                      {reservation.totalAmount && reservation.status === 'completed' && (
                        <div className='mt-3 flex items-center gap-2 text-green-600 font-semibold'>
                          <CreditCard size={16} />
                          <span>
  Total: {formatCurrency(reservation.totalAmount)}
</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Acciones */}
                    <div className='flex gap-2'>
                      <button
                        onClick={() => setExpandedReservation(expandedReservation === reservation.id ? null : reservation.id)}
                        className='p-2 text-gray-400 hover:text-blue-600 transition-colors'
                        title="Ver detalles"
                      >
                        {expandedReservation === reservation.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      <button
                        onClick={() => handleViewDetails(reservation.id)}
                        className='p-2 text-gray-400 hover:text-blue-600 transition-colors'
                        title="Ver más detalles"
                      >
                        <Eye size={20} />
                      </button>
                      {(reservation.status === 'pending_confirmation' || reservation.status === 'confirmed') && (
                        <button
                          onClick={() => handleCancelReservation(reservation.id)}
                          disabled={cancellingId === reservation.id}
                          className='p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50'
                          title="Cancelar reserva"
                        >
                          {cancellingId === reservation.id ? (
                            <div className='animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent'></div>
                          ) : (
                            <Trash2 size={20} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Detalle expandido */}
                  {expandedReservation === reservation.id && (
                    <div className='mt-4 pt-4 border-t border-gray-100'>
                      <div className='grid md:grid-cols-2 gap-4 text-sm'>
                        <div>
                          <p className='text-gray-500'>ID de reserva</p>
                          <p className='font-mono text-xs'>{reservation.id}</p>
                        </div>
                        <div>
                          <p className='text-gray-500'>Fecha de creación</p>
                          <p>{formatDate(reservation.createdAt)}</p>
                        </div>
                        {reservation.expiresAt && (
                          <div>
                            <p className='text-gray-500'>Expiración de confirmación</p>
                            <p className={new Date(reservation.expiresAt) < new Date() ? 'text-red-600' : ''}>
                              {formatDate(reservation.expiresAt)}
                            </p>
                          </div>
                        )}
                        {reservation.status === 'pending_confirmation' && (
                          <div className='md:col-span-2 bg-yellow-50 rounded-xl p-3'>
                            <p className='text-yellow-700 text-sm flex items-center gap-2'>
                              <Clock3 size={16} />
                              Esta reserva está pendiente de confirmación por el estacionamiento.
                              {reservation.expiresAt && new Date(reservation.expiresAt) > new Date() && (
                                <span>Tiene hasta {formatDate(reservation.expiresAt)} para confirmarse.</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón refrescar */}
        {myReservations.length > 0 && (
          <div className='mt-6 flex justify-center'>
            <button
              onClick={() => fetchMyReservations()}
              disabled={isLoading}
              className='flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50'
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default MyReservationsPage;