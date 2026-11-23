// frontend/src/features/owner/components/ParkingSettingsForm.tsx
import { useState, type FormEvent, useRef } from 'react';
import { useParkingLotsStore } from '../../stores/parkingStore';
import { useToast } from '../../shared/hooks/useToast';
import { parkingImageService } from '../../services/parking-image.service';
import { CircleParking, Loader2 } from 'lucide-react';

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

/* Estilos compartidos (azul EstacionApp para acciones de guardado) */
const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white ' +
  'transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1';
const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 ' +
  'transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300';
const BTN_OUTLINE_BLUE =
  'inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 ' +
  'transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300';
const CHECKBOX = 'h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-blue-600';

const ParkingSettingsForm = ({ parkingData, onCancel, onManageSpaces }: ParkingSettingsFormProps) => {
  const { updateParkingLot, updateParkingImage } = useParkingLotsStore();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState<ParkingData>(parkingData);

  // Solo se puede guardar si cambió algo de lo que guarda este formulario
  // (la imagen se sube y guarda al instante, aparte).
  const isDirty =
    formData.name !== parkingData.name ||
    formData.is_active !== parkingData.is_active ||
    formData.settings.allowOnlineReservations !== parkingData.settings.allowOnlineReservations;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isDirty || loading) return;
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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Dos columnas cuando el bloque es ancho; una sola si es angosto (o se abre el menú) */}
      <div className="grid gap-8 cq-md:grid-cols-2 cq-md:gap-10">
        {/* Columna 1: identidad */}
        <div className="space-y-6">
          {/* Imagen: siempre en fila, alineada a la izquierda */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              aria-label="Cambiar imagen del estacionamiento"
              className="group relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-md
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              {formData.image_url ? (
                <img src={formData.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4F93F8] to-[#2F6BEA]">
                  <CircleParking size={60} strokeWidth={1.5} className="text-white" aria-hidden="true" />
                </span>
              )}

              {isUploadingImage ? (
                <span className="absolute inset-0 flex items-center justify-center bg-blue-700/60">
                  <Loader2 size={22} className="animate-spin text-white" />
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-blue-700/0 text-xs font-bold text-white opacity-0 transition-all duration-200 group-hover:bg-blue-700/60 group-hover:opacity-100">
                  Cambiar
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              disabled={isUploadingImage}
              className="hidden"
            />
            <div className="min-w-0 text-left">
              <p className="text-xl font-bold leading-tight text-black">Imagen del estacionamiento</p>
              <p className="mt-1 text-sm   text-gray-500">JPG, PNG, WebP - Max 5MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="mt-1 text-sm font-bold text-gray-500 underline-offset-2 transition-colors hover:text-blue-700 hover:underline disabled:opacity-50"
              >
                {isUploadingImage ? 'Subiendo…' : 'Cambiar Imagen'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="parking-name" className="mb-2 block text-base font-bold text-gray-900">
              Nombre del estacionamiento
            </label>
            <input
              id="parking-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Nombre del estacionamiento"
            />
          </div>
        </div>

        {/* Columna 2: capacidad y disponibilidad */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4">
            <div>
              <p className="text-base font-bold text-gray-900">Espacios totales</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900">{parkingData.total_spaces ?? '—'}</p>
              {parkingData.total_spaces == null && <p className="text-xs text-gray-500">No definido</p>}
            </div>
            <button type="button" onClick={onManageSpaces} className={BTN_OUTLINE_BLUE}>
              Gestionar espacios
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-base font-bold text-gray-900">Disponibilidad</legend>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-blue-50/40">
                <span className="text-sm text-gray-900">Estacionamiento operativo</span>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className={CHECKBOX}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-blue-50/40">
                <span className="text-sm text-gray-900">Permitir reservas online</span>
                <input
                  type="checkbox"
                  checked={formData.settings.allowOnlineReservations}
                  onChange={(e) => setFormData({
                    ...formData, 
                    settings: { ...formData.settings, allowOnlineReservations: e.target.checked }
                  })}
                  className={CHECKBOX}
                />
              </label>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Barra de guardado: queda fija sobre la pantalla mientras el bloque está a la vista */}
      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <span className={`mr-auto text-sm ${isDirty ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
          {isDirty ? 'Tenés cambios sin guardar.' : 'Sin cambios.'}
        </span>
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Cancelar
        </button>
        <button type="submit" disabled={!isDirty || loading} className={BTN_PRIMARY}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
};

export default ParkingSettingsForm;
