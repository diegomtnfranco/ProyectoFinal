// frontend/src/features/owner/pages/ParkingSettingsPage.tsx
import { useEffect, useState } from 'react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import ParkingSettingsForm, { type ParkingData } from './ParkingSettingsForm';
import SpaceManagementModal from './components/SpaceManagementModal';
import ParkingProfileSection from './parking-profile/ParkingProfileSection';
import NightPolicyCard from './parking-profile/NightPolicyCard';
import SettingsSection from './parking-profile/SettingsSection';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ParkingSettingsPage = () => {
  const navigate = useNavigate();
  const { currentParkingLot, isLoading, fetchMyParkingLot, hasFetchedOnce } = useParkingLotsStore();
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // ✅ Para forzar refresco

  useEffect(() => {
    if (!hasFetchedOnce && !isLoading) {
      fetchMyParkingLot();
    }
  }, [hasFetchedOnce, isLoading, fetchMyParkingLot]);

  // ✅ Función para recargar después de cambios en espacios
  const handleSpaceUpdate = async () => {
    await fetchMyParkingLot(true);
    setRefreshKey(prev => prev + 1); // ✅ Forzar re-render
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Cargando configuración...</div>
      </div>
    );
  }

  if (!currentParkingLot && hasFetchedOnce) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">No hay estacionamiento registrado.</div>
      </div>
    );
  }

  if (!currentParkingLot) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  const parkingDataForForm: ParkingData = {
    id: currentParkingLot.id,
    name: currentParkingLot.name,
    is_active: currentParkingLot.isActive ?? true,
    image_url: (currentParkingLot as any).imageUrl ?? "",
    total_spaces: currentParkingLot.stats?.totalSpaces ?? 0,
    settings: {
      allowOnlineReservations: (currentParkingLot as any).settings?.allowOnlineReservations ?? false
    }
  };

  return (
    <div className="w-full">
      {/* Header con navegación */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/owner/parking')}
          aria-label="Volver al panel"
          className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Configuración del estacionamiento</h1>
          <p className="text-sm text-gray-500">{currentParkingLot.name}</p>
        </div>
      </div>

      <div className="space-y-4">

      {/* 1 · Opciones generales - key para forzar refresh */}
      <SettingsSection
        id="general"
        title="Opciones generales"
        description="Imagen, nombre, espacios y disponibilidad del estacionamiento."
      >
        <ParkingSettingsForm 
          key={refreshKey} // ✅ Forzar re-render cuando cambia
          parkingData={parkingDataForForm} 
          onCancel={() => navigate('/owner/settings')}
          onManageSpaces={() => setShowSpaceModal(true)}
        />
      </SettingsSection>

      {/* 2 · Tarifa nocturna */}
      <SettingsSection
        id="night"
        title="Tarifa nocturna"
        description="Cómo se cobra el tiempo entre el cierre y la reapertura."
      >
        <NightPolicyCard parkingLotId={currentParkingLot.id} />
      </SettingsSection>

      {/* 3 · Servicios: información pública, características y servicios */}
      <SettingsSection
        id="services"
        title="Servicios"
        description="Lo que ven tus clientes en la página de reservas."
      >
        <ParkingProfileSection parkingLotId={currentParkingLot.id} />
      </SettingsSection>
      </div>

      {/* Modal de gestión de espacios */}
      <SpaceManagementModal
        isOpen={showSpaceModal}
        onClose={() => {
          setShowSpaceModal(false);
          handleSpaceUpdate(); // ✅ Recargar al cerrar
        }}
        parkingLotId={currentParkingLot.id}
        onSpaceUpdate={handleSpaceUpdate} // ✅ Recargar después de cada cambio
      />
    </div>
  );
};

export default ParkingSettingsPage;