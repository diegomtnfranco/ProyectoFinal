import { useParkingLotsStore } from '../../stores/parkingStore';
import ParkingSettingsForm, { type ParkingData } from './ParkingSettingsForm';

const ParkingSettingsPage = () => {
  const { currentParkingLot, isLoading } = useParkingLotsStore();

  if (isLoading) return <div>Cargando...</div>;
  if (!currentParkingLot) return <div>No hay estacionamiento seleccionado.</div>;


  const parkingDataForForm: ParkingData = {
    id: currentParkingLot.id,
    name: currentParkingLot.name,
    is_active: (currentParkingLot as any).is_active ?? true,
    image_url: (currentParkingLot as any).image_url ?? "",
    total_spaces: currentParkingLot.stats?.totalSpaces ?? 0,
    settings: {
      allowOnlineReservations: (currentParkingLot as any).settings?.allowOnlineReservations ?? false
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configuración del Parking</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <ParkingSettingsForm parkingData={parkingDataForForm} />
      </div>
    </div>
  );
};

export default ParkingSettingsPage;