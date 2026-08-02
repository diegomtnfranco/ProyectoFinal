// frontend/src/features/admin/pages/AdminUserEditPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../../shared/hooks/useToast';
import { api } from '../../../services/api';
import {
  User, Mail, Phone, Car, Building2, MapPin, Save, Loader2, Pencil, BadgeCheck, Briefcase,
  ArrowLeft, Shield, CheckCircle, XCircle, Power
} from 'lucide-react';
import { authService } from '../../../services/auth.service';

interface UserProfile {
  id: string;
  email: string;
  role: 'client' | 'parking_owner' | 'parking_employee' | 'admin';
  isActive: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
  clientProfile?: { 
    id: string;
    name: string; 
    phone: string;
    defaultVehiclePlate?: string;
    defaultVehicleType?: string;
  };
  parkingOwnerProfile?: { 
    id: string;
    name: string;
    businessName: string; 
    isApproved: boolean;
    phone?: string;
    address?: string;
    cuit?: string;
  };
  employeeProfile?: { 
    id: string;
    name: string; 
    position?: string; 
    isActive: boolean;
    employeeCode?: string;
    parkingLotId: string;
  };
}

function AdminUserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
    isActive: true,
    isVerified: true,
    // Cliente
    clientName: '',
    clientPhone: '',
    defaultVehiclePlate: '',
    defaultVehicleType: 'car',
    // Dueño
    ownerName: '',
    ownerBusinessName: '',
    ownerPhone: '',
    ownerAddress: '',
    isApproved: true,
    // Empleado
    employeeName: '',
    employeePosition: '',
    employeeCode: '',
  });

  // ✅ Función para cargar usuario
  const fetchUser = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const response = await api.get<UserProfile>(`/users/admin/${id}`);
      const user = response.data;
      setUserData(user);
      setFormData({
        email: user.email || '',
        newPassword: '',
        confirmPassword: '',
        isActive: user.isActive ?? true,
        isVerified: user.isVerified ?? true,
        clientName: user.clientProfile?.name || '',
        clientPhone: user.clientProfile?.phone || '',
        defaultVehiclePlate: user.clientProfile?.defaultVehiclePlate || '',
        defaultVehicleType: user.clientProfile?.defaultVehicleType || 'car',
        ownerName: user.parkingOwnerProfile?.name || '',
        ownerBusinessName: user.parkingOwnerProfile?.businessName || '',
        ownerPhone: user.parkingOwnerProfile?.phone || '',
        ownerAddress: user.parkingOwnerProfile?.address || '',
        isApproved: user.parkingOwnerProfile?.isApproved ?? true,
        employeeName: user.employeeProfile?.name || '',
        employeePosition: user.employeeProfile?.position || '',
        employeeCode: user.employeeProfile?.employeeCode || '',
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      showError('Error al cargar los datos del usuario');
      navigate('/admin/users');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ useEffect con ref para evitar múltiples ejecuciones
  useEffect(() => {
    if (id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchUser();
    }
  }, [id]);

  // ✅ Si el id cambia, permitir recarga
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ✅ handleSubmit corregido
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updateData: any = {};
      let hasChanges = false;

      // 1. Email y password (van en user)
      if (formData.email !== userData?.email) {
        updateData.user = { ...updateData.user, email: formData.email };
        hasChanges = true;
      }

      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          showError('Las contraseñas no coinciden');
          setIsSaving(false);
          return;
        }
        if (formData.newPassword.length < 8) {
          showError('La contraseña debe tener al menos 8 caracteres');
          setIsSaving(false);
          return;
        }
        updateData.user = { ...updateData.user, password: formData.newPassword };
        hasChanges = true;
      }

      // 2. isVerified (va en el objeto raíz del DTO)
      if (formData.isVerified !== userData?.isVerified) {
        updateData.isVerified = formData.isVerified;
        hasChanges = true;
      }

      // 3. Datos de cliente
      if (userData?.role === 'client') {
        const clientData: any = {};
        if (formData.clientName !== userData.clientProfile?.name) clientData.name = formData.clientName;
        if (formData.clientPhone !== userData.clientProfile?.phone) clientData.phone = formData.clientPhone;
        if (formData.defaultVehiclePlate !== userData.clientProfile?.defaultVehiclePlate) {
          clientData.defaultVehiclePlate = formData.defaultVehiclePlate;
        }
        if (formData.defaultVehicleType !== userData.clientProfile?.defaultVehicleType) {
          clientData.defaultVehicleType = formData.defaultVehicleType;
        }
        if (Object.keys(clientData).length > 0) {
          updateData.client = clientData;
          hasChanges = true;
        }
      }

      // 4. Datos de dueño
      if (userData?.role === 'parking_owner') {
        const ownerData: any = {};
        if (formData.ownerName !== userData.parkingOwnerProfile?.name) ownerData.name = formData.ownerName;
        if (formData.ownerBusinessName !== userData.parkingOwnerProfile?.businessName) {
          ownerData.businessName = formData.ownerBusinessName;
        }
        if (formData.ownerPhone !== userData.parkingOwnerProfile?.phone) ownerData.phone = formData.ownerPhone;
        if (formData.ownerAddress !== userData.parkingOwnerProfile?.address) ownerData.address = formData.ownerAddress;
        if (formData.isApproved !== userData.parkingOwnerProfile?.isApproved) {
          ownerData.isApproved = formData.isApproved;
        }
        if (Object.keys(ownerData).length > 0) {
          updateData.owner = ownerData;
          hasChanges = true;
        }
      }

      // 5. Datos de empleado
      if (userData?.role === 'parking_employee') {
        const employeeData: any = {};
        if (formData.employeeName !== userData.employeeProfile?.name) employeeData.name = formData.employeeName;
        if (formData.employeePosition !== userData.employeeProfile?.position) {
          employeeData.position = formData.employeePosition;
        }
        if (formData.employeeCode !== userData.employeeProfile?.employeeCode) {
          employeeData.employeeCode = formData.employeeCode;
        }
        if (Object.keys(employeeData).length > 0) {
          updateData.employee = employeeData;
          hasChanges = true;
        }
      }

      // 6. isActive - Usar endpoint separado
      if (formData.isActive !== userData?.isActive) {
        const endpoint = formData.isActive ? '/activate' : '/deactivate';
        await api.patch(`/users/${id}${endpoint}`);
        hasChanges = true;
      }

      if (!hasChanges) {
        showSuccess('No hay cambios para guardar');
        setIsSaving(false);
        return;
      }

      // 7. Enviar datos (si hay)
      if (Object.keys(updateData).length > 0) {
        await api.patch(`/users/admin/${id}`, updateData);
      }

      showSuccess('Usuario actualizado exitosamente');
      navigate('/admin/users');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Error al actualizar el usuario';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Por favor, selecciona una imagen válida (JPG, PNG o WebP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('La imagen no debe superar 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);
        const response = await authService.uploadAvatar(file);
      
      
      setUserData(prev => prev ? { ...prev, avatarUrl: response.url } : null);
      showSuccess('Avatar actualizado exitosamente');
    } catch (error) {
      showError('Error al subir la imagen');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ✅ Estados de carga y error
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Usuario no encontrado</p>
      </div>
    );
  }

  const isClient = userData.role === 'client';
  const isOwner = userData.role === 'parking_owner';
  const isEmployee = userData.role === 'parking_employee';
  const isAdmin = userData.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative"
              >
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                    <Loader2 size={32} className="text-white animate-spin" />
                  </div>
                )}

                {!isUploadingAvatar && (
                  <>
                    {userData.avatarUrl ? (
                      <img
                        src={userData.avatarUrl}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <User size={48} className="text-white" />
                    )}
                  </>
                )}

                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center cursor-pointer">
                  <Pencil size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
                className="hidden"
              />
            </div>

            {/* Información del usuario */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2 justify-center md:justify-start">
                {isClient ? formData.clientName : 
                 isOwner ? formData.ownerBusinessName : 
                 isEmployee ? formData.employeeName : 
                 userData.email.split('@')[0]}
                <span className={`text-xs px-2 py-1 rounded-full ${userData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {userData.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </h1>
              <p className="text-gray-500 capitalize flex items-center justify-center md:justify-start gap-1">
                <BadgeCheck size={14} className="text-blue-500" />
                {isAdmin ? 'Administrador' : 
                 isOwner ? 'Dueño' : 
                 isEmployee ? 'Empleado' : 'Cliente'}
                {isOwner && !formData.isApproved && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Pendiente de aprobación
                  </span>
                )}
                {!userData.isVerified && (
                  <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    No verificado
                  </span>
                )}
              </p>
              <p className="text-gray-400 text-sm">{userData.email}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-xl flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Volver
              </button>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6">
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail size={14} className="inline mr-1" /> Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Estado del usuario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Power size={18} className={formData.isActive ? 'text-green-600' : 'text-red-600'} />
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Usuario {formData.isActive ? 'Activo' : 'Inactivo'}
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle size={18} className={formData.isVerified ? 'text-green-600' : 'text-yellow-600'} />
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="isVerified"
                    checked={formData.isVerified}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Email {formData.isVerified ? 'Verificado' : 'No verificado'}
                </label>
              </div>
            </div>

            {/* Si es dueño, mostrar aprobación */}
            {isOwner && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                <Shield size={18} className="text-yellow-600" />
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="isApproved"
                    checked={formData.isApproved}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Cuenta {formData.isApproved ? 'Aprobada' : 'Pendiente de aprobación'}
                </label>
              </div>
            )}

            {/* Datos específicos según rol */}
            {isClient && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User size={14} className="inline mr-1" /> Nombre completo
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={14} className="inline mr-1" /> Teléfono
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Car size={14} className="inline mr-1" /> Patente por defecto
                    </label>
                    <input
                      type="text"
                      name="defaultVehiclePlate"
                      value={formData.defaultVehiclePlate || ''}
                      onChange={handleChange}
                      placeholder="ABC123"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de vehículo</label>
                    <select
                      name="defaultVehicleType"
                      value={formData.defaultVehicleType}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="car">Auto</option>
                      <option value="motorcycle">Moto</option>
                      <option value="van">Van</option>
                      <option value="truck">Camión</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {isOwner && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User size={14} className="inline mr-1" /> Nombre del propietario
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 size={14} className="inline mr-1" /> Razón social
                  </label>
                  <input
                    type="text"
                    name="ownerBusinessName"
                    value={formData.ownerBusinessName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={14} className="inline mr-1" /> Teléfono
                  </label>
                  <input
                    type="tel"
                    name="ownerPhone"
                    value={formData.ownerPhone || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin size={14} className="inline mr-1" /> Dirección
                  </label>
                  <input
                    type="text"
                    name="ownerAddress"
                    value={formData.ownerAddress || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {isEmployee && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User size={14} className="inline mr-1" /> Nombre completo
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Briefcase size={14} className="inline mr-1" /> Cargo
                  </label>
                  <input
                    type="text"
                    name="employeePosition"
                    value={formData.employeePosition || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <BadgeCheck size={14} className="inline mr-1" /> Código de empleado
                  </label>
                  <input
                    type="text"
                    name="employeeCode"
                    value={formData.employeeCode || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Power size={18} className={formData.isActive ? 'text-green-600' : 'text-red-600'} />
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    Empleado {formData.isActive ? 'Activo' : 'Inactivo'}
                  </label>
                </div>
              </>
            )}

            {/* Contraseña */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-gray-700 mb-3">Cambiar contraseña</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-red-500 text-sm mt-2">Las contraseñas no coinciden</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                <span className="text-blue-500">ℹ️</span> Dejar en blanco para mantener la contraseña actual.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-6 border-t mt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2.5 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminUserEditPage;