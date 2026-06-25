import { useState, type FormEvent } from 'react';
import { useParkingLotsStore } from '../../stores/parkingStore';

export interface ParkingData {
  id: string | number;
  name: string;
  is_active: boolean;
  image_url: string;
  total_spaces?: number; // Campo informativo
  settings: {
    allowOnlineReservations: boolean;
  };
}

const ParkingSettingsForm = ({ parkingData }: { parkingData: ParkingData }) => {
  const { updateParkingLot } = useParkingLotsStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ParkingData>(parkingData);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateParkingLot(String(parkingData.id), {
        name: formData.name,
        is_active: formData.is_active,
        image_url: formData.image_url,
        settings: formData.settings
      } as any);
      alert("Configuración guardada correctamente");
    } catch (error) {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. Campo Informativo */}
      <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
        <strong>Espacios totales:</strong> {parkingData.total_spaces ?? 'No definido'}
      </div>

      {/* 2. Campo Imagen */}
      <div>
        <label className="block text-sm font-medium">URL de Imagen del Parking</label>
        <input 
          className="w-full border p-2 rounded"
          value={formData.image_url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, image_url: e.target.value})}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Nombre del Estacionamiento</label>
        <input 
          className="w-full border p-2 rounded"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>

      <div className="flex items-center gap-4">
        <label>Estado Operativo:</label>
        <input 
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
        />
      </div>

      <div className="flex items-center gap-4">
        <label>Reservas Online:</label>
        <input 
          type="checkbox"
          checked={formData.settings.allowOnlineReservations}
          onChange={(e) => setFormData({
            ...formData, 
            settings: { ...formData.settings, allowOnlineReservations: e.target.checked }
          })}
        />
      </div>

      <button type="submit" disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded">
        {loading ? "Guardando..." : "Guardar Cambios"}
      </button>
    </form>
  );
};

export default ParkingSettingsForm;