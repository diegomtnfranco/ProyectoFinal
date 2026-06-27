import { useEffect } from 'react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import ParkingSettingsForm, { type ParkingData } from './ParkingSettingsForm';

const ParkingSettingsPage = () => {

  const { currentParkingLot, isLoading, fetchMyParkingLot  } = useParkingLotsStore();

  useEffect(() => {
    if (!currentParkingLot && !isLoading) {
      fetchMyParkingLot();
    }
  }, [currentParkingLot, isLoading, fetchMyParkingLot]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Cargando configuración...</div>
      </div>
    );
  }

  if (!currentParkingLot) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">No hay estacionamiento seleccionado.</div>
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

  const handleCancel = () => {
    
    window.location.reload(); 
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configuración del Parking</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <ParkingSettingsForm 
          parkingData={parkingDataForForm} 
          onCancel={handleCancel} 
        />
      </div>
    </div>
  );
};

export default ParkingSettingsPage;