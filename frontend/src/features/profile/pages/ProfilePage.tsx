// frontend/src/features/profile/pages/ProfilePage.tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../shared/hooks/useToast';
import { 
  User, Mail, Phone, Car, Building2, MapPin, Save, Loader2
} from 'lucide-react';

function ProfilePage() {
  const { user, updateProfile, isLoading: authLoading } = useAuthStore();
  const { showSuccess, showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'vehicles' | 'security'>('info');
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
    clientName: '',
    clientPhone: '',
    defaultVehiclePlate: '',
    defaultVehicleType: 'car',
    ownerBusinessName: '',
    ownerPhone: '',
    ownerAddress: '',
  });

  // Actualizar formData cuando cambia user - SIN LLAMAR A getProfile
  useEffect(() => {
    if (user) {
      console.log('ProfilePage - user:', user);
      console.log('ProfilePage - parkingOwnerProfile:', (user as any).parkingOwnerProfile);
      
      setFormData({
        email: user.email || '',
        newPassword: '',
        confirmPassword: '',
        clientName: (user as any).clientProfile?.name || '',
        clientPhone: (user as any).clientProfile?.phone || '',
        defaultVehiclePlate: (user as any).clientProfile?.defaultVehiclePlate || '',
        defaultVehicleType: (user as any).clientProfile?.defaultVehicleType || 'car',
        ownerBusinessName: (user as any).parkingOwnerProfile?.businessName || '',
        ownerPhone: (user as any).parkingOwnerProfile?.phone || '',
        ownerAddress: (user as any).parkingOwnerProfile?.address || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {};
    
    if (formData.email !== user?.email) {
      updateData.user = { ...updateData.user, email: formData.email };
    }
    
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
    
    if (user?.role === 'client') {
      const clientData: any = {};
      if (formData.clientName !== (user as any).clientProfile?.name) clientData.name = formData.clientName;
      if (formData.clientPhone !== (user as any).clientProfile?.phone) clientData.phone = formData.clientPhone;
      if (formData.defaultVehiclePlate !== (user as any).clientProfile?.defaultVehiclePlate) clientData.defaultVehiclePlate = formData.defaultVehiclePlate;
      if (formData.defaultVehicleType !== (user as any).clientProfile?.defaultVehicleType) clientData.defaultVehicleType = formData.defaultVehicleType;
      if (Object.keys(clientData).length > 0) updateData.client = clientData;
    }
    
    if (user?.role === 'parking_owner') {
      const ownerData: any = {};
      if (formData.ownerBusinessName !== (user as any).parkingOwnerProfile?.businessName) ownerData.businessName = formData.ownerBusinessName;
      if (formData.ownerPhone !== (user as any).parkingOwnerProfile?.phone) ownerData.phone = formData.ownerPhone;
      if (formData.ownerAddress !== (user as any).parkingOwnerProfile?.address) ownerData.address = formData.ownerAddress;
      if (Object.keys(ownerData).length > 0) updateData.owner = ownerData;
    }
    
    if (Object.keys(updateData).length === 0) {
      showError('No hay cambios para guardar');
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

  const isClient = user?.role === 'client';
  const isOwner = user?.role === 'parking_owner';

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
            <div className='w-24 h-24 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center'>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className='w-24 h-24 rounded-full object-cover' />
              ) : (
                <User size={48} className='text-white' />
              )}
            </div>
            
            <div className='text-center md:text-left'>
              <h1 className='text-2xl font-bold'>
                {isClient ? formData.clientName : isOwner ? formData.ownerBusinessName : user?.email?.split('@')[0]}
              </h1>
              <p className='text-gray-500 capitalize'>{user?.role?.replace('_', ' ')}</p>
              <p className='text-gray-400 text-sm'>{user?.email}</p>
            </div>
            
            <div className='md:ml-auto'>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl'>
                  Editar perfil
                </button>
              ) : (
                <div className='flex gap-2'>
                  <button onClick={() => setIsEditing(false)} className='bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-xl'>
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} disabled={authLoading} className='bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl flex items-center gap-2'>
                    {authLoading ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}
                    Guardar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex gap-2 mb-6 border-b border-gray-200'>
          <button onClick={() => setActiveTab('info')} className={`px-4 py-2 font-medium ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Información personal
          </button>
          {isClient && (
            <button onClick={() => setActiveTab('vehicles')} className={`px-4 py-2 font-medium ${activeTab === 'vehicles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
              Vehículos
            </button>
          )}
          <button onClick={() => setActiveTab('security')} className={`px-4 py-2 font-medium ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Seguridad
          </button>
        </div>

        {/* Contenido - Información personal */}
        {activeTab === 'info' && (
          <div className='bg-white rounded-2xl shadow-sm p-6'>
            <div className='space-y-4'>
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
              
              {isOwner && (
                <>
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
            </div>
          </div>
        )}

        {/* Contenido - Vehículos (solo clientes) */}
        {activeTab === 'vehicles' && isClient && (
          <div className='bg-white rounded-2xl shadow-sm p-6'>
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
                </>
              ) : (
                <p className='text-gray-500 text-center py-4'>Para cambiar tu contraseña, hacé click en "Editar perfil"</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;