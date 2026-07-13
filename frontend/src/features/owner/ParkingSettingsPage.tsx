// frontend/src/features/owner/pages/ParkingSettingsPage.tsx
import { useEffect, useState } from 'react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import ParkingSettingsForm, { type ParkingData } from './ParkingSettingsForm';
import SpaceManagementModal from './components/SpaceManagementModal';
import { Settings, ArrowLeft } from 'lucide-react';
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header con navegación */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/owner/parking')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={20} />
          Configuración del Parking
        </h1>
      </div>

      {/* Formulario principal - key para forzar refresh */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
        <ParkingSettingsForm 
          key={refreshKey} // ✅ Forzar re-render cuando cambia
          parkingData={parkingDataForForm} 
          onCancel={() => navigate('/owner/settings')}
          onManageSpaces={() => setShowSpaceModal(true)}
        />
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