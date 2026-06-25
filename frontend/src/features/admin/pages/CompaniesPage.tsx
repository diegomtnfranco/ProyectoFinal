// frontend/src/features/admin/pages/CompaniesPage.tsx
import { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import { useToast } from '../../../shared/hooks/useToast';
import { 
  Eye, 
  Pencil, 
  Power, 
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Clock,
  Car,
  RefreshCw,
  Info,
  User
} from 'lucide-react';

function CompaniesPage() {
  const { 
    parkingLots = [], 
    isLoading, 
    total = 0, 
    currentPage = 1, 
    totalPages = 1,
    fetchAllParkingLots, 
    toggleParkingLotStatus,
    setPage
  } = useAdminStore();
  const { showSuccess, showError } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, setPage]);

  useEffect(() => {
    fetchAllParkingLots({
      page: currentPage,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });
  }, [fetchAllParkingLots, currentPage, debouncedSearch, statusFilter]);

const handleToggleStatus = async (id: string, currentStatus: boolean) => {
  setActionLoading(id);
  try {
    await toggleParkingLotStatus(id, !currentStatus);
    showSuccess(`Estacionamiento ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`);
    // El store ya actualizó el estado local, la UI se actualizará automáticamente
  } catch (error) {
    showError('Error al cambiar el estado del estacionamiento');
  } finally {
    // Pequeño delay para que se vea el loading
    setTimeout(() => {
      setActionLoading(null);
    }, 300);
  }
};

  const handleViewDetails = (id: string) => {
    window.open(`/admin/parking-lots/${id}`, '_blank');
  };

  const handleEdit = (id: string) => {
    window.open(`/admin/parking-lots/${id}/edit`, '_blank');
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPage(1);
  };

  const handleRefresh = () => {
    fetchAllParkingLots({
      page: currentPage,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleShowTooltip = (text: string, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipContent({
      text,
      x: rect.left,
      y: rect.bottom + 5,
    });
  };

  const handleHideTooltip = () => {
    setTooltipContent(null);
  };

  // Mostrar loading mientras carga
  if (isLoading && (!parkingLots || parkingLots.length === 0)) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  const safeParkingLots = parkingLots || [];
  const activeCount = safeParkingLots.filter(p => p?.isActive).length;
  const inactiveCount = safeParkingLots.filter(p => !p?.isActive).length;

  // Función para truncar texto
  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Estacionamientos
          </h1>
          <p className="text-sm text-gray-500">
            Administración de empresas y parkings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Filtros - responsive */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección o dueño..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        {(searchTerm || statusFilter !== 'all') && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Estadísticas rápidas - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-lg">
              <Building2 className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xl font-bold">{total || safeParkingLots.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2.5 rounded-lg">
              <Car className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xl font-bold">{activeCount}</p>
              <p className="text-xs text-gray-500">Activos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2.5 rounded-lg">
              <Power className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-xl font-bold">{inactiveCount}</p>
              <p className="text-xs text-gray-500">Inactivos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla responsive con scroll horizontal */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estacionamiento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                Dueño
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Capacidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                Horario
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {safeParkingLots.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p>No se encontraron estacionamientos</p>
                </td>
              </tr>
            ) : (
              safeParkingLots.map((parking) => (
                <tr key={parking.id} className="hover:bg-gray-50 transition-colors">
                  {/* Nombre y dirección - con tooltip */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <button
                        onMouseEnter={(e) => handleShowTooltip(parking.address, e)}
                        onMouseLeave={handleHideTooltip}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-left cursor-help"
                      >
                        {truncateText(parking.name, 25)}
                      </button>
                      <div className="flex items-center gap-1 text-xs text-gray-400 md:hidden">
                        <User size={12} />
                        <span className="truncate max-w-[150px]">
                          {parking.owner?.businessName || parking.owner?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 lg:hidden">
                        <Clock size={12} />
                        <span>{parking.openTime} - {parking.closeTime}</span>
                      </div>
                    </div>
                  </td>

                  {/* Dueño - desktop */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {truncateText( parking.owner?.name || 'N/A', 25)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {parking.owner?.email || ''}
                      </p>
                    </div>
                  </td>

                  {/* Capacidad */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Car size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {parking.stats?.totalSpaces || 0}
                      </span>
                    </div>
                  </td>

                  {/* Horario - desktop */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {parking.openTime} - {parking.closeTime}
                      </span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        parking.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${parking.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {parking.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleViewDetails(parking.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Ver detalles"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(parking.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(parking.id, parking.isActive)}
                        disabled={actionLoading === parking.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          parking.isActive
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        } disabled:opacity-50`}
                        title={parking.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {actionLoading === parking.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Power size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tooltip flotante para dirección */}
      {tooltipContent && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            left: tooltipContent.x,
            top: tooltipContent.y,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-start gap-2">
            <MapPin size={14} className="flex-shrink-0 mt-0.5" />
            <span className="break-words">{tooltipContent.text}</span>
          </div>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}

      {/* Paginación - responsive */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-500 order-1 sm:order-none">
            Mostrando {safeParkingLots.length} de {total} estacionamientos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                
                if (endPage - startPage + 1 < maxVisible) {
                  startPage = Math.max(1, endPage - maxVisible + 1);
                }
                
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }
                
                return pages.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ));
              })()}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompaniesPage;