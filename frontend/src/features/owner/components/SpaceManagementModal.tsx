// frontend/src/features/owner/components/SpaceManagementModal.tsx
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Car, Loader2, RefreshCw, Filter } from 'lucide-react';
import { useSpacesStore } from '../../../stores/spacesStore';
import { useParkingLotsStore } from '../../../stores/parkingStore';
import { useToast } from '../../../shared/hooks/useToast';
import type { Space, CreateSpaceDto } from '../../../types/parking.types';
import { SpaceStatus } from '../../../types/auth.types';

interface SpaceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  parkingLotId: string;
  onSpaceUpdate?: () => void;
}

type FilterType = 'all' | 'active' | 'inactive';

const SpaceManagementModal = ({ isOpen, onClose, parkingLotId, onSpaceUpdate }: SpaceManagementModalProps) => {
  const { spaces, isLoading, fetchAllSpaces, createSpace, updateSpaceStatus, removeSpace, reactivateSpace } = useSpacesStore();
  const { fetchMyParkingLot } = useParkingLotsStore();
  const { showSuccess, showError } = useToast();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSpaceNumber, setNewSpaceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (isOpen && parkingLotId) {
      fetchAllSpaces(parkingLotId);
    }
  }, [isOpen, parkingLotId, fetchAllSpaces]);

  const getNextSpaceNumber = (): string => {
    if (!spaces || spaces.length === 0) {
      return '001';
    }
    
    const numbers = spaces
      .map(space => parseInt(space.spaceNumber.match(/\d+/)?.[0] || '0'))
      .filter(num => num > 0);
    
    if (numbers.length === 0) {
      return '001';
    }
    
    const maxNumber = Math.max(...numbers);
    const nextNumber = maxNumber + 1;
    return nextNumber.toString().padStart(3, '0');
  };

  const handleOpenAddForm = () => {
    setNewSpaceNumber(getNextSpaceNumber());
    setShowAddForm(true);
  };

  const handleAddSpace = async () => {
    if (!newSpaceNumber.trim()) {
      showError('Ingresa un número de espacio');
      return;
    }

    setIsSubmitting(true);
    try {
      const createData: CreateSpaceDto = {
        parkingLotId,
        spaceNumber: newSpaceNumber.trim().toUpperCase(),
        allowedVehicleTypes: ['car', 'motorcycle', 'van', 'truck'],
        status: SpaceStatus.AVAILABLE,
        allowsReservations: true,
      };
      
      await createSpace(createData);
      showSuccess(`Espacio ${newSpaceNumber} creado exitosamente`);
      setNewSpaceNumber('');
      setShowAddForm(false);
      
      await fetchAllSpaces(parkingLotId);
      await fetchMyParkingLot();
      onSpaceUpdate?.();
    } catch (error) {
      showError(error as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSpace = async (space: Space) => {
    if (!confirm(`¿Estás seguro de eliminar el espacio ${space.spaceNumber}?`)) return;
    
    try {
      await removeSpace(space.id);
      showSuccess(`Espacio ${space.spaceNumber} eliminado`);
      await fetchAllSpaces(parkingLotId);
      await fetchMyParkingLot();
      onSpaceUpdate?.();
    } catch (error) {
      showError(error as string);
    }
  };

  const handleReactivateSpace = async (space: Space) => {
    try {
      await reactivateSpace(space.id);
      await fetchAllSpaces(parkingLotId);
      await fetchMyParkingLot();
      showSuccess(`Espacio ${space.spaceNumber} reactivado exitosamente`);
      onSpaceUpdate?.();
    } catch (error) {
      showError(error as string);
    }
  };

  const handleToggleStatus = async (space: Space) => {
    if (space.isActive === false) {
      showError('Este espacio está desactivado. Reactívalo primero.');
      return;
    }

    const newStatus = space.status === SpaceStatus.AVAILABLE 
      ? SpaceStatus.MAINTENANCE 
      : SpaceStatus.AVAILABLE;
    
    try {
      await updateSpaceStatus(space.id, { status: newStatus });
      const statusText = newStatus === SpaceStatus.AVAILABLE ? 'disponible' : 'en mantenimiento';
      showSuccess(`Espacio ${space.spaceNumber} ${statusText}`);
      await fetchAllSpaces(parkingLotId);
      onSpaceUpdate?.();
    } catch (error) {
      showError(error as string);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllSpaces(parkingLotId);
      await fetchMyParkingLot();
      showSuccess('Lista actualizada');
      onSpaceUpdate?.();
    } catch (error) {
      showError('Error al actualizar');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getFilteredSpaces = () => {
    if (filter === 'all') return spaces;
    if (filter === 'active') return spaces.filter(s => s.isActive !== false);
    if (filter === 'inactive') return spaces.filter(s => s.isActive === false);
    return spaces;
  };

  const getSpaceStats = () => {
    const total = spaces.length;
    const active = spaces.filter(s => s.isActive !== false).length;
    const inactive = spaces.filter(s => s.isActive === false).length;
    const available = spaces.filter(s => s.status === SpaceStatus.AVAILABLE && s.isActive !== false).length;
    const occupied = spaces.filter(s => s.status === SpaceStatus.OCCUPIED && s.isActive !== false).length;
    const reserved = spaces.filter(s => s.status === SpaceStatus.RESERVED && s.isActive !== false).length;
    const maintenance = spaces.filter(s => s.status === SpaceStatus.MAINTENANCE && s.isActive !== false).length;
    return { total, active, inactive, available, occupied, reserved, maintenance };
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return { label: 'Desactivado', color: 'text-gray-500', bg: 'bg-gray-200' };
    }
    const config: Record<string, { label: string; color: string; bg: string }> = {
      available: { label: 'Disponible', color: 'text-green-700', bg: 'bg-green-100' },
      occupied: { label: 'Ocupado', color: 'text-red-700', bg: 'bg-red-100' },
      reserved: { label: 'Reservado', color: 'text-yellow-700', bg: 'bg-yellow-100' },
      maintenance: { label: 'Mantenimiento', color: 'text-gray-700', bg: 'bg-gray-100' },
    };
    return config[status] || config.available;
  };

  const filteredSpaces = getFilteredSpaces();
  const stats = getSpaceStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-2 sm:gap-0">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
              <Car size={20} className="text-blue-600 flex-shrink-0" />
              <span>Gestión de Espacios</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              {stats.total} total · {stats.active} activos · {stats.inactive} inactivos
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Filtros - Responsive */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${
                  filter === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${
                  filter === 'active' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${
                  filter === 'inactive' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Inactivos
              </button>
            </div>
            <button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 flex-shrink-0"
              title="Actualizar lista"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Lista de espacios - Grid responsive */}
          {isLoading ? (
            <div className="flex justify-center py-8 sm:py-12">
              <Loader2 size={28} className="animate-spin text-blue-600" />
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Car size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="font-medium text-sm sm:text-base">No hay espacios que coincidan con el filtro</p>
              <p className="text-xs text-gray-400 mt-1">
                {filter === 'all' && 'Haz clic en "Agregar espacio" para comenzar'}
                {filter === 'active' && 'No hay espacios activos'}
                {filter === 'inactive' && 'No hay espacios inactivos'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {filteredSpaces.map((space) => {
                const isInactive = space.isActive === false;
                const statusConfig = getStatusBadge(space.status, !isInactive);
                
                return (
                  <div
                    key={space.id}
                    className={`border-2 rounded-xl p-3 hover:shadow-md transition-all ${
                      isInactive 
                        ? 'border-gray-300 bg-gray-100 opacity-70'
                        : space.status === SpaceStatus.OCCUPIED
                        ? 'border-red-200 bg-red-50'
                        : space.status === SpaceStatus.RESERVED
                        ? 'border-yellow-200 bg-yellow-50'
                        : space.status === SpaceStatus.MAINTENANCE
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-mono font-bold text-base sm:text-lg ${isInactive ? 'text-gray-400 line-through' : ''}`}>
                        {space.spaceNumber}
                      </span>
                      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium ${statusConfig.bg} ${statusConfig.color} whitespace-nowrap`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    
                    {space.status === SpaceStatus.OCCUPIED && space.occupiedByVehiclePlate && (
                      <p className="text-[10px] sm:text-xs text-gray-500 truncate flex items-center gap-1">
                        <span>🚗</span> {space.occupiedByVehiclePlate}
                      </p>
                    )}
                    
                    {isInactive && (
                      <p className="text-[10px] text-gray-400 italic mt-1">Desactivado</p>
                    )}
                    
                    <div className="flex gap-1.5 mt-2">
                      {isInactive ? (
                        <button
                          onClick={() => handleReactivateSpace(space)}
                          className="text-[10px] sm:text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 sm:px-3 py-1 rounded-full transition-colors flex-1 font-medium"
                        >
                          Reactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(space)}
                          className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full transition-colors flex-1 font-medium ${
                            space.status === SpaceStatus.MAINTENANCE 
                              ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {space.status === SpaceStatus.MAINTENANCE ? 'Activar' : 'Mantenimiento'}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveSpace(space)}
                        className="text-[10px] sm:text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 sm:px-3 py-1 rounded-full transition-colors flex-shrink-0"
                        title="Eliminar espacio"
                      >
                        <Trash2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario para agregar espacio - Responsive */}
          {showAddForm && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                Agregar nuevo espacio
              </h4>
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] sm:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">
                    Número de espacio
                  </label>
                  {/* ✅ Campo de solo lectura con fondo gris */}
                  <input
                    type="text"
                    value={newSpaceNumber}
                    readOnly
                    disabled
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-xl bg-gray-100 text-gray-700 font-mono text-sm sm:text-base cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5 hidden xs:block">
                    Número auto-asignado
                  </p>
                </div>
                <div className="flex items-end gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={handleAddSpace}
                    disabled={isSubmitting || !newSpaceNumber.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span className="hidden xs:inline">Agregar</span>
                    <span className="inline xs:hidden">OK</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewSpaceNumber('');
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Responsive */}
        <div className="p-3 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {!showAddForm && (
              <button
                onClick={handleOpenAddForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-1 sm:gap-2 transition-colors text-sm flex-shrink-0"
              >
                <Plus size={16} />
                <span className="hidden xs:inline">Agregar espacio</span>
                <span className="inline xs:hidden">Agregar</span>
              </button>
            )}
            <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
              {stats.total > 0 && `Próximo: ${getNextSpaceNumber()}`}
            </span>
          </div>
          
          {/* Stats - Responsive wrap */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-gray-400">
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-200 border border-green-300"></span>
              <span className="hidden xs:inline">disp.</span>
              <span className="inline xs:hidden">D</span>
              {stats.available}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-200 border border-red-300"></span>
              <span className="hidden xs:inline">ocup.</span>
              <span className="inline xs:hidden">O</span>
              {stats.occupied}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-200 border border-yellow-300"></span>
              <span className="hidden xs:inline">res.</span>
              <span className="inline xs:hidden">R</span>
              {stats.reserved}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gray-200 border border-gray-300"></span>
              <span className="hidden xs:inline">mant.</span>
              <span className="inline xs:hidden">M</span>
              {stats.maintenance}
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl transition-colors text-sm flex-shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpaceManagementModal;