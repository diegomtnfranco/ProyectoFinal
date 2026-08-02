import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../../stores/adminStore';
import { useToast } from '../../../shared/hooks/useToast';
import { api } from '../../../services/api';
import {
    Users,
    Search,
    Loader2,
    User,
    Mail,
    Shield,
    CheckCircle,
    XCircle,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    Pencil,
    Power,
    Filter,
    X
} from 'lucide-react';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'client' | 'parking_owner' | 'parking_employee' | 'admin';
    isActive: boolean;
    isVerified: boolean;
    avatarUrl?: string;
    createdAt: string;
    clientProfile?: { name: string; phone: string };
    parkingOwnerProfile?: { businessName: string; isApproved: boolean; name: string };
    employeeProfile?: { name: string; position: string; isActive: boolean };
}

function UsersPage() {
    const { showSuccess, showError } = useToast();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'parking_owner' | 'parking_employee' | 'admin'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const navigate = useNavigate();


    const handleEditUser = (userId: string) => {
        navigate(`/admin/users/${userId}/edit`);
    };

    const limit = 10;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Cargar usuarios
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            params.append('limit', limit.toString());
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (roleFilter !== 'all') params.append('role', roleFilter);

            const response = await api.get<{
                data: UserProfile[];
                total: number;
                page: number;
                totalPages: number;
            }>(`/users?${params.toString()}`);

            setUsers(response.data.data || []);
            setTotal(response.data.total || 0);
            setTotalPages(response.data.totalPages || 1);
            console.log('Fetched users:', response.data.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showError('Error al cargar los usuarios');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [currentPage, debouncedSearch, roleFilter]);

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId);
        try {
            const endpoint = currentStatus ? '/deactivate' : '/activate';
            await api.patch(`/users/${userId}${endpoint}`);
            await fetchUsers();
            showSuccess(`Usuario ${currentStatus ? 'desactivado' : 'activado'} exitosamente`);
        } catch (error) {
            showError('Error al cambiar el estado del usuario');
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setRoleFilter('all');
        setCurrentPage(1);
    };

    const getRoleBadge = (role: string) => {
        const config: Record<string, { label: string; color: string; bg: string }> = {
            admin: { label: 'Administrador', color: 'text-purple-700', bg: 'bg-purple-100' },
            parking_owner: { label: 'Dueño', color: 'text-blue-700', bg: 'bg-blue-100' },
            parking_employee: { label: 'Empleado', color: 'text-green-700', bg: 'bg-green-100' },
            client: { label: 'Cliente', color: 'text-gray-700', bg: 'bg-gray-100' },
        };
        return config[role] || config.client;
    };

    const getDisplayName = (user: UserProfile) => {
        if (user.clientProfile?.name) return user.clientProfile.name;
        if (user.parkingOwnerProfile?.name) return user.parkingOwnerProfile.name;
        if (user.employeeProfile?.name) return user.employeeProfile.name;
        return user.email.split('@')[0];
    };

    const getRoleDisplay = (user: UserProfile) => {
        if (user.role === 'parking_owner' && user.parkingOwnerProfile) {
            return `${getRoleBadge(user.role).label} ${!user.parkingOwnerProfile.isApproved ? '(Pendiente)' : ''}`;
        }
        return getRoleBadge(user.role).label;
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Users size={28} />
                        Usuarios
                    </h1>
                    <p className="text-sm text-gray-500">
                        Gestión de usuarios del sistema
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchUsers}
                        disabled={isLoading}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                        title="Actualizar"
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value as typeof roleFilter);
                        setCurrentPage(1);
                    }}
                    className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="all">Todos los roles</option>
                    <option value="admin">Administradores</option>
                    <option value="parking_owner">Dueños</option>
                    <option value="parking_employee">Empleados</option>
                    <option value="client">Clientes</option>
                </select>

                {(searchTerm || roleFilter !== 'all') && (
                    <button
                        onClick={handleClearFilters}
                        className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-2xl font-bold text-gray-800">{total}</p>
                    <p className="text-xs text-gray-500">Total usuarios</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-2xl font-bold text-green-600">{users.filter(u => u.isActive).length}</p>
                    <p className="text-xs text-gray-500">Activos</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-2xl font-bold text-red-600">{users.filter(u => !u.isActive).length}</p>
                    <p className="text-xs text-gray-500">Inactivos</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-2xl font-bold text-yellow-600">{users.filter(u => !u.isVerified).length}</p>
                    <p className="text-xs text-gray-500">No verificados</p>
                </div>
            </div>

            {/* Lista de usuarios */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={36} className="animate-spin text-blue-600" />
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
                    <Users className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p>No se encontraron usuarios</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Email</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Estado</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => {
                                    const roleConfig = getRoleBadge(user.role);
                                    const displayName = getDisplayName(user);

                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {user.avatarUrl ? (
                                                        <img
                                                            src={user.avatarUrl}
                                                            alt={displayName}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-gray-800 truncate max-w-[120px] sm:max-w-none">
                                                        {displayName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                                                <div className="flex items-center gap-1">
                                                    <Mail size={14} className="text-gray-400" />
                                                    <span className="truncate max-w-[150px]">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full ${roleConfig.bg} ${roleConfig.color}`}>
                                                    {getRoleDisplay(user)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className="flex items-center gap-2">
                                                    {user.isActive ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs">
                                                            <CheckCircle size={14} /> Activo
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-red-600 text-xs">
                                                            <XCircle size={14} /> Inactivo
                                                        </span>
                                                    )}
                                                    {(!user.isVerified ) && (
                                                        <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                                                            No verificado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditUser(user.id)}
                                                        className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                        title="Editar usuario"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                                                        disabled={actionLoading === user.id}
                                                        className={`p-1.5 rounded-lg transition-colors ${user.isActive
                                                                ? 'hover:bg-red-50 hover:text-red-600'
                                                                : 'hover:bg-green-50 hover:text-green-600'
                                                            }`}
                                                        title={user.isActive ? 'Desactivar' : 'Activar'}
                                                    >
                                                        {actionLoading === user.id ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <Power size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-gray-500 order-1 sm:order-none">
                        Mostrando {users.length} de {total} usuarios
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${currentPage === page
                                                ? 'bg-blue-600 text-white'
                                                : 'hover:bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

export default UsersPage;