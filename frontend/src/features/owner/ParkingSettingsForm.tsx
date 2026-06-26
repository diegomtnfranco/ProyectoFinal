import { useState, type FormEvent, useRef } from 'react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { useToast } from '../../shared/hooks/useToast';
import { parkingImageService } from '../../services/parking-image.service';

export interface ParkingData {
  id: string | number;
  name: string;
  is_active: boolean;
  image_url: string;
  total_spaces?: number;
  settings: { allowOnlineReservations: boolean; };
}

const ParkingSettingsForm = ({ parkingData, onCancel }: { parkingData: ParkingData; onCancel: () => void }) => {
  const { updateParkingLot } = useParkingLotsStore();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ParkingData>(parkingData);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateParkingLot(String(parkingData.id), {
        name: formData.name,
        isActive: formData.is_active,
        settings: formData.settings
      } as any);
      
      showSuccess("Configuración guardada correctamente");
      onCancel(); 
    } catch (error) {
      showError(error as string);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const { imageUrl } = await parkingImageService.updateParkingImage(String(parkingData.id), file);
      setFormData({ ...formData, image_url: imageUrl });
      showSuccess("Imagen actualizada");
    } catch (error) {
      showError("Error al subir la imagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
        <strong>Espacios totales:</strong> {parkingData.total_spaces ?? 'No definido'}
      </div>

      <div>
        <label className="block text-sm font-medium">Imagen del Parking</label>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-500 underline">
          Cambiar imagen
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
      </div>

      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <input className="w-full border p-2 rounded" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
      </div>

      <div className="flex items-center gap-4">
        <label>Estado Operativo:</label>
        <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
      </div>

      <div className="flex items-center gap-4">
        <label>Reservas Online:</label>
        <input type="checkbox" checked={formData.settings.allowOnlineReservations} onChange={(e) => setFormData({...formData, settings: { ...formData.settings, allowOnlineReservations: e.target.checked }})} />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded">
          {loading ? "Guardando..." : "Guardar Cambios"}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-300 px-4 py-2 rounded">Cancelar</button>
      </div>
    </form>
  );
};

export default ParkingSettingsForm;