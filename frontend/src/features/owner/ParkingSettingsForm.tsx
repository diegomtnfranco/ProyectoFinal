// frontend/src/features/owner/components/ParkingSettingsForm.tsx
import { useState, type FormEvent, useRef } from 'react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { useToast } from '../../shared/hooks/useToast';
import { parkingImageService } from '../../services/parking-image.service';
import { Save, Loader2, Pencil, Image, Building2, Settings, Car, Plus } from 'lucide-react';

export interface ParkingData {
  id: string | number;
  name: string;
  is_active: boolean;
  image_url: string;
  total_spaces?: number;
  settings: { allowOnlineReservations: boolean; };
}

interface ParkingSettingsFormProps {
  parkingData: ParkingData;
  onCancel: () => void;
  onManageSpaces: () => void;
}

const ParkingSettingsForm = ({ parkingData, onCancel, onManageSpaces }: ParkingSettingsFormProps) => {
  const { updateParkingLot, updateParkingImage } = useParkingLotsStore();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState<ParkingData>(parkingData);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateParkingLot(String(parkingData.id), {
        name: formData.name,
        isActive: formData.is_active,
        settings: formData.settings
      });
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
      setIsUploadingImage(true);
      const response = await parkingImageService.updateParkingImage(String(parkingData.id), file);
      
      setFormData({ ...formData, image_url: response.url });
      updateParkingImage({ imageUrl: response.url });
      showSuccess("Imagen actualizada");
    } catch (error) {
      showError("Error al subir la imagen");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Imagen del Parking - Responsive */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        <div className="relative group flex-shrink-0">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer relative overflow-hidden"
          >
            {isUploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            )}
            
            {!isUploadingImage && (
              <>
                {formData.image_url ? (
                  <img
                    src={formData.image_url}
                    alt="Parking"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image size={32} className="text-white" />
                )}
              </>
            )}
            
            <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center cursor-pointer">
              <Pencil size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            disabled={isUploadingImage}
            className="hidden"
          />
        </div>
        <div className="text-center sm:text-left">
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Imagen del estacionamiento</h3>
          <p className="text-xs sm:text-sm text-gray-500">Haz clic en la imagen para cambiarla</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Formatos: JPG, PNG, WebP (máx. 5MB)</p>
        </div>
      </div>

      {/* Información de espacios - Responsive */}
      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Car size={16} className="text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-700 text-sm sm:text-base">Espacios totales:</span>
            <span className="font-bold text-base sm:text-lg text-blue-600">{parkingData.total_spaces ?? 'No definido'}</span>
          </div>
          <button
            type="button"
            onClick={onManageSpaces}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors w-full xs:w-auto justify-center"
          >
            <Car size={14} />
            <span className="hidden xs:inline">Gestionar espacios</span>
            <span className="inline xs:hidden">Gestionar</span>
          </button>
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Building2 size={14} className="inline mr-1" />
          Nombre del estacionamiento
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full border border-gray-300 rounded-xl px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nombre del estacionamiento"
        />
      </div>

      {/* Configuraciones */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-700 flex items-center gap-2 text-sm sm:text-base">
          <Settings size={16} />
          Configuraciones
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
            />
            <span className="text-xs sm:text-sm">Estacionamiento operativo</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.settings.allowOnlineReservations}
              onChange={(e) => setFormData({
                ...formData, 
                settings: { ...formData.settings, allowOnlineReservations: e.target.checked }
              })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
            />
            <span className="text-xs sm:text-sm">Permitir reservas online</span>
          </label>
        </div>
      </div>

      {/* Botones - Responsive */}
      <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm sm:text-base order-2 xs:order-1"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition-colors text-sm sm:text-base order-1 xs:order-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default ParkingSettingsForm;