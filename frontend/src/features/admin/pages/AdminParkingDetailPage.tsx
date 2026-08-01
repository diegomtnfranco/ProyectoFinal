import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../../stores/adminStore';
import { useToast } from '../../../shared/hooks/useToast';
import { Loader2, ArrowLeft, Building2 } from 'lucide-react';
import ParkingSettingsForm from '../../owner/ParkingSettingsForm';
import SpaceManagementModal from '../../owner/components/SpaceManagementModal';
import type { ParkingData } from '../../owner/ParkingSettingsForm';

function AdminParkingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentParkingLot, isLoading, fetchParkingLotDetails } = useAdminStore();
  const { showSuccess, showError } = useToast();
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (id) {
      fetchParkingLotDetails(id);
    }
  }, [id, fetchParkingLotDetails]);

  const handleSpaceUpdate = () => {
    if (id) {
      fetchParkingLotDetails(id);
      setRefreshKey(prev => prev + 1);
    }
  };

  if (isLoading || !currentParkingLot) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  const parkingDataForForm: ParkingData = {
    id: currentParkingLot.id,
    name: currentParkingLot.name,
    is_active: currentParkingLot.isActive ?? true,
    image_url: (currentParkingLot as any).imageUrl ?? "",
    total_spaces: currentParkingLot.spaces?.length ?? 0,
    settings: {
      allowOnlineReservations: (currentParkingLot as any).settings?.allowOnlineReservations ?? false
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/companies')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building2 size={20} />
          Editar Estacionamiento
        </h1>
      </div>

      {/* Formulario de configuración (reutilizado del owner) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
        <ParkingSettingsForm
          key={refreshKey}
          parkingData={parkingDataForForm}
          onCancel={() => navigate('/admin/companies')}
          onManageSpaces={() => setShowSpaceModal(true)}
        />
      </div>

      {/* Modal de gestión de espacios (reutilizado del owner) */}
      <SpaceManagementModal
        isOpen={showSpaceModal}
        onClose={() => {
          setShowSpaceModal(false);
          handleSpaceUpdate();
        }}
        parkingLotId={currentParkingLot.id}
        onSpaceUpdate={handleSpaceUpdate}
      />
    </div>
  );
}

export default AdminParkingDetailPage;