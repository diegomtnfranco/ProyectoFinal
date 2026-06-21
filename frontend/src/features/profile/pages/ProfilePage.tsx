import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../shared/hooks/useToast';
import { authService } from '../../../services/auth.service';
import {
  User, Mail, Phone, Car, Building2, MapPin, Save, Loader2, Pencil, BadgeCheck, Briefcase
} from 'lucide-react';

function ProfilePage() {
  const { user, updateProfile, updateUser, isLoading: authLoading } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'vehicles' | 'security'>('info');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
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
    // Empleado
    employeeName: '',
    employeePosition: '',
    employeeCode: '',
  });

  // Actualizar formData cuando cambia user
  useEffect(() => {
    if (user) {
      const userData: any = user;
      
      setFormData({
        email: user.email || '',
        newPassword: '',
        confirmPassword: '',
        // Datos de cliente
        clientName: userData.clientProfile?.name || '',
        clientPhone: userData.clientProfile?.phone || '',
        defaultVehiclePlate: userData.clientProfile?.defaultVehiclePlate || '',
        defaultVehicleType: userData.clientProfile?.defaultVehicleType || 'car',
        // Datos de dueño
        ownerName: userData.parkingOwnerProfile?.name || '',
        ownerBusinessName: userData.parkingOwnerProfile?.businessName || '',
        ownerPhone: userData.parkingOwnerProfile?.phone || '',
        ownerAddress: userData.parkingOwnerProfile?.address || '',
        // Datos de empleado
        employeeName: userData.employeeProfile?.name || '',
        employeePosition: userData.employeeProfile?.position || '',
        employeeCode: userData.employeeProfile?.employeeCode || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: any = {};

    // Actualizar email
    if (formData.email !== user?.email) {
      updateData.user = { ...updateData.user, email: formData.email };
    }

    // Actualizar contraseña
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        showError('Las contraseñas no coinciden');
        return;
      }
      if (formData.newPassword.length < 8) {
        showError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      updateData.user = { ...updateData.user, password: formData.newPassword };
    }

    // Datos específicos según rol
    const userRole = user?.role;

    if (userRole === 'client') {
      const clientData: any = {};
      const currentClient = (user as any).clientProfile;
      
      if (formData.clientName !== currentClient?.name) clientData.name = formData.clientName;
      if (formData.clientPhone !== currentClient?.phone) clientData.phone = formData.clientPhone;
      if (formData.defaultVehiclePlate !== currentClient?.defaultVehiclePlate) {
        clientData.defaultVehiclePlate = formData.defaultVehiclePlate;
      }
      if (formData.defaultVehicleType !== currentClient?.defaultVehicleType) {
        clientData.defaultVehicleType = formData.defaultVehicleType;
      }
      
      if (Object.keys(clientData).length > 0) {
        updateData.client = clientData;
      }
    }

    if (userRole === 'parking_owner') {
      const ownerData: any = {};
      const currentOwner = (user as any).parkingOwnerProfile;
      
      if (formData.ownerName !== currentOwner?.name) ownerData.name = formData.ownerName;
      if (formData.ownerBusinessName !== currentOwner?.businessName) {
        ownerData.businessName = formData.ownerBusinessName;
      }
      if (formData.ownerPhone !== currentOwner?.phone) ownerData.phone = formData.ownerPhone;
      if (formData.ownerAddress !== currentOwner?.address) ownerData.address = formData.ownerAddress;
      
      if (Object.keys(ownerData).length > 0) {
        updateData.owner = ownerData;
      }
    }

    if (userRole === 'parking_employee') {
      // Los empleados solo pueden actualizar: email, password y avatar
      // El nombre NO se actualiza desde aquí
      
      // Solo enviamos actualizaciones de usuario (email, password)
      // No incluimos employee en updateData
      
      if (!updateData.user && !formData.email && !formData.newPassword) {
        showSuccess('No hay cambios pendientes');
        setIsEditing(false);
        return;
      }
    }

    if (Object.keys(updateData).length === 0) {
      showSuccess('No hay cambios pendientes');
      setIsEditing(false);
      return;
    }

    try {
      await updateProfile(updateData);
      showSuccess('Perfil actualizado exitosamente');
      setIsEditing(false);
    } catch (error) {
      showError('Error al actualizar el perfil');
    }
  };

  // Manejo de avatar
  const handleAvatarClick = () => {
    if (isUploadingAvatar) return;
    fileInputRef.current?.click();
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
      const response = await authService.uploadAvatar(file);
      updateUser({ avatarUrl: response.url });
      showSuccess('Avatar actualizado exitosamente');
    } catch (error) {
      console.error('Error al subir avatar:', error);
      showError('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isClient = user?.role === 'client';
  const isOwner = user?.role === 'parking_owner';
  const isEmployee = user?.role === 'parking_employee';

  // Obtener el nombre a mostrar según el rol
  const getDisplayName = () => {
    if (isClient) {
      return formData.clientName || user?.email?.split('@')[0] || 'Cliente';
    }
    if (isOwner) {
      return  formData.ownerName || user?.email?.split('@')[0] || 'Propietario';
    }
    if (isEmployee) {
      return formData.employeeName || user?.email?.split('@')[0] || 'Empleado';
    }
    return user?.email?.split('@')[0] || 'Usuario';
  };

  // Obtener el rol traducido
  const getRoleLabel = () => {
    const roleMap = {
      'client': 'Cliente',
      'parking_owner': 'Propietario',
      'parking_employee': 'Empleado',
      'admin': 'Administrador'
    };
    return roleMap[user?.role as keyof typeof roleMap] || user?.role || '';
  };

  if (authLoading && !user) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <Loader2 className='animate-spin h-12 w-12 text-blue-600 mx-auto mb-4' />
        <p className='text-gray-600'>Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-gray-600'>No hay usuario autenticado</p>
          <button
            onClick={() => window.location.href = '/'}
            className='mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl'
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100 py-8'>
      <div className='max-w-4xl mx-auto px-4'>
        {/* Header */}
        <div className='bg-white rounded-2xl shadow-sm p-6 mb-6'>
          <div className='flex flex-col md:flex-row items-center gap-6'>
            {/* Avatar */}
            <div className='relative group'>
              <div
                onClick={handleAvatarClick}
                className='w-24 h-24 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative'
              >
                {isUploadingAvatar && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30 rounded-full'>
                    <Loader2 size={32} className='text-white animate-spin' />
                  </div>
                )}

                {!isUploadingAvatar && (
                  <>
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt='Avatar'
                        className='w-24 h-24 rounded-full object-cover'
                      />
                    ) : (
                      <User size={48} className='text-white' />
                    )}
                  </>
                )}

                <div className='absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center cursor-pointer'>
                  <Pencil
                    size={24}
                    className='text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200'
                  />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
                className='hidden'
              />
            </div>

            {/* Información del usuario */}
            <div className='text-center md:text-left'>
              <h1 className='text-2xl font-bold'>
                {getDisplayName()}
              </h1>
              <p className='text-gray-500 capitalize flex items-center justify-center md:justify-start gap-1'>
                <BadgeCheck size={14} className="text-blue-500" />
                {getRoleLabel()}
                {isOwner && (user as any).parkingOwnerProfile?.isApproved === false && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Pendiente de aprobación
                  </span>
                )}
              </p>
              <p className='text-gray-400 text-sm'>{user?.email}</p>
            </div>

            <div className='md:ml-auto'>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl'
                >
                  Editar perfil
                </button>
              ) : (
                <div className='flex gap-2'>
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className='bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-xl'
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={authLoading} 
                    className='bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl flex items-center gap-2'
                  >
                    {authLoading ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}
                    Guardar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs - Los empleados NO ven la pestaña de vehículos */}
        <div className='flex gap-2 mb-6 border-b border-gray-200'>
          <button 
            onClick={() => setActiveTab('info')} 
            className={`px-4 py-2 font-medium ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Información personal
          </button>
          {!isEmployee && (
            <button 
              onClick={() => setActiveTab('vehicles')} 
              className={`px-4 py-2 font-medium ${activeTab === 'vehicles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              {isClient ? 'Vehículos' : 'Información del negocio'}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('security')} 
            className={`px-4 py-2 font-medium ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Seguridad
          </button>
        </div>

        {/* Contenido - Información personal */}
        {activeTab === 'info' && (
          <div className='bg-white rounded-2xl shadow-sm p-6'>
            <div className='space-y-4'>
              {/* Email - Todos los roles pueden editar */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  <Mail size={14} className="inline mr-1" /> Correo electrónico
                </label>
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                />
              </div>

              {/* Datos de Cliente */}
              {isClient && (
                <>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <User size={14} className="inline mr-1" /> Nombre completo
                    </label>
                    <input
                      type='text'
                      name='clientName'
                      value={formData.clientName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <Phone size={14} className="inline mr-1" /> Teléfono
                    </label>
                    <input
                      type='tel'
                      name='clientPhone'
                      value={formData.clientPhone || ''}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                    />
                  </div>
                </>
              )}

              {/* Datos de Dueño */}
              {isOwner && (
                <>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <User size={14} className="inline mr-1" /> Nombre del propietario
                    </label>
                    <input
                      type='text'
                      name='ownerName'
                      value={formData.ownerName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                      placeholder='Juan Pérez'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <Building2 size={14} className="inline mr-1" /> Razón social
                    </label>
                    <input
                      type='text'
                      name='ownerBusinessName'
                      value={formData.ownerBusinessName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                      placeholder='Estacionamiento Centro SRL'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <Phone size={14} className="inline mr-1" /> Teléfono
                    </label>
                    <input
                      type='tel'
                      name='ownerPhone'
                      value={formData.ownerPhone || ''}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <MapPin size={14} className="inline mr-1" /> Dirección
                    </label>
                    <input
                      type='text'
                      name='ownerAddress'
                      value={formData.ownerAddress || ''}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                    />
                  </div>
                </>
              )}

              {/* Datos de Empleado - SOLO LECTURA */}
              {isEmployee && (
                <>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <User size={14} className="inline mr-1" /> Nombre completo
                    </label>
                    <input
                      type='text'
                      name='employeeName'
                      value={formData.employeeName}
                      disabled={true}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 bg-gray-100 cursor-not-allowed'
                    />
                    <p className='text-xs text-gray-400 mt-1'>
                      <span className="text-blue-500">ℹ️</span> El nombre solo puede ser modificado por el propietario del estacionamiento.
                    </p>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      <Briefcase size={14} className="inline mr-1" /> Cargo
                    </label>
                    <input
                      type='text'
                      name='employeePosition'
                      value={formData.employeePosition || ''}
                      disabled={true}
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 bg-gray-100 cursor-not-allowed'
                    />
                    <p className='text-xs text-gray-400 mt-1'>
                      <span className="text-blue-500">ℹ️</span> El cargo solo puede ser modificado por el propietario del estacionamiento.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Contenido - Vehículos (clientes) / Información negocio (dueños) */}
        {activeTab === 'vehicles' && !isEmployee && (
          <div className='bg-white rounded-2xl shadow-sm p-6'>
            {isClient && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    <Car size={14} className="inline mr-1" /> Patente por defecto
                  </label>
                  <input
                    type='text'
                    name='defaultVehiclePlate'
                    value={formData.defaultVehiclePlate || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder='ABC123'
                    className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 uppercase'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Tipo de vehículo</label>
                  <select
                    name='defaultVehicleType'
                    value={formData.defaultVehicleType}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
                  >
                    <option value='car'>Auto</option>
                    <option value='motorcycle'>Moto</option>
                    <option value='van'>Van</option>
                    <option value='truck'>Camión</option>
                  </select>
                </div>
              </div>
            )}

            {isOwner && (
              <div className='space-y-4'>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <Building2 size={18} />
                    Información del negocio
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-gray-600">Razón social:</span> 
                      <span className="text-gray-800 ml-2">{formData.ownerBusinessName || 'No especificado'}</span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">Propietario:</span> 
                      <span className="text-gray-800 ml-2">{formData.ownerName || 'No especificado'}</span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">Teléfono:</span> 
                      <span className="text-gray-800 ml-2">{formData.ownerPhone || 'No especificado'}</span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">Dirección:</span> 
                      <span className="text-gray-800 ml-2">{formData.ownerAddress || 'No especificado'}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contenido - Seguridad */}
        {activeTab === 'security' && (
          <div className='bg-white rounded-2xl shadow-sm p-6'>
            <div className='space-y-4'>
              {isEditing ? (
                <>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Nueva contraseña</label>
                    <input
                      type='password'
                      name='newPassword'
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder='••••••••'
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Confirmar contraseña</label>
                    <input
                      type='password'
                      name='confirmPassword'
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder='••••••••'
                      className='w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                  {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                    <p className='text-red-500 text-sm'>Las contraseñas no coinciden</p>
                  )}
                  <p className='text-xs text-gray-400 mt-1'>
                    <span className="text-blue-500">ℹ️</span> La contraseña debe tener al menos 8 caracteres.
                  </p>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className='text-gray-500'>Para cambiar tu contraseña, hacé click en "Editar perfil"</p>
                  <p className='text-xs text-gray-400 mt-2'>Recomendamos usar una contraseña segura con mayúsculas, minúsculas, números y símbolos.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;