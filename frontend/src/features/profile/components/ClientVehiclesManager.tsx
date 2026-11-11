import { useEffect, useState, type FormEvent } from 'react';
import { Car, LoaderCircle, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { clientVehiclesService } from '../../../services/client-tracking.service';
import { toErrorMessage } from '../../../services/parking-profile.service';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmModal } from '../../../shared/components/common/ConfirmModal';
import { MAX_CLIENT_VEHICLES, type ClientVehicle, type ClientVehiclePayload } from '../../../types/client-tracking.types';
import type { UserVehicleType } from '../../../types/auth.types';
import { useAuthStore } from '../../../stores/authStore';
import { useClientVehiclesStore } from '../../../stores/clientVehiclesStore';

const TYPES: { value: UserVehicleType; label: string }[] = [
  { value: 'car', label: 'Auto' },
  { value: 'motorcycle', label: 'Moto' },
  { value: 'truck', label: 'Camioneta' },
  { value: 'van', label: 'Utilitario' },
];
const normalize = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, '');
const empty: ClientVehiclePayload = { plate: '', vehicleType: 'car', name: '', brand: '', model: '' };

/** Perfil > Mi vehículo: hasta 3 vehículos por cliente (el backend también lo valida) */
function ClientVehiclesManager() {
  const { showSuccess, showError } = useToast();
  const [vehicles, setVehicles] = useState<ClientVehicle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<ClientVehiclePayload>(empty);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ClientVehicle | null>(null);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const syncSharedVehicles = useClientVehiclesStore((s) => s.setVehicles);

  // Mantiene sincronizadas las recomendaciones de tarifas del listado (sin otra petición)
  useEffect(() => {
    if (vehicles && userId) syncSharedVehicles(userId, vehicles);
  }, [vehicles, userId, syncSharedVehicles]);

  useEffect(() => {
    let cancelled = false;
    clientVehiclesService
      .list()
      .then((list) => !cancelled && setVehicles(list))
      .catch((err) => !cancelled && setLoadError(toErrorMessage(err, 'No se pudieron cargar tus vehículos')));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError}</p>;
  if (!vehicles) {
    return (
      <p className="flex items-center gap-2 text-gray-500">
        <LoaderCircle size={16} className="animate-spin" /> Cargando vehículos…
      </p>
    );
  }

  const atLimit = vehicles.length >= MAX_CLIENT_VEHICLES;

  const startEdit = (v?: ClientVehicle) => {
    setFormError(null);
    if (v) {
      setEditing(v.id);
      setForm({ plate: v.plate, vehicleType: v.vehicleType, name: v.name ?? '', brand: v.brand ?? '', model: v.model ?? '' });
    } else {
      setEditing('new');
      setForm(empty);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const plate = normalize(form.plate);
    if (plate.length < 5 || plate.length > 10) return setFormError('La patente debe tener entre 5 y 10 letras o números');
    if (vehicles.some((v) => v.id !== editing && normalize(v.plate) === plate)) return setFormError('Ya tenés un vehículo con esa patente');
    if (editing === 'new' && atLimit) return setFormError(`Podés registrar hasta ${MAX_CLIENT_VEHICLES} vehículos`);

    const payload: ClientVehiclePayload = {
      plate: form.plate.trim(),
      vehicleType: form.vehicleType,
      name: form.name?.trim() || null,
      brand: form.brand?.trim() || null,
      model: form.model?.trim() || null,
    };
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await clientVehiclesService.create(payload);
        setVehicles((list) => [...(list ?? []), created]);
        showSuccess('Vehículo registrado');
      } else if (editing) {
        const updated = await clientVehiclesService.update(editing, payload);
        setVehicles((list) => (list ?? []).map((v) => (v.id === updated.id ? updated : v)));
        showSuccess('Vehículo actualizado');
      }
      setEditing(null);
    } catch (err) {
      setFormError(toErrorMessage(err, 'No se pudo guardar el vehículo'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || saving) return;
    setSaving(true);
    try {
      await clientVehiclesService.remove(toDelete.id);
      setVehicles((list) => (list ?? []).filter((v) => v.id !== toDelete.id));
      showSuccess('Vehículo eliminado');
    } catch (err) {
      showError(toErrorMessage(err, 'No se pudo eliminar el vehículo'));
    } finally {
      setSaving(false);
      setToDelete(null);
    }
  };

  const field = (key: keyof ClientVehiclePayload, label: string, placeholder = '') => (
    <div>
      <label htmlFor={`veh-${key}`} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={`veh-${key}`}
        value={(form[key] as string) ?? ''}
        maxLength={key === 'plate' ? 15 : 50}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: key === 'plate' ? e.target.value.toUpperCase() : e.target.value })}
        className={`w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${key === 'plate' ? 'font-mono uppercase' : ''}`}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {vehicles.length} de {MAX_CLIENT_VEHICLES} vehículos registrados. Cuando una de estas patentes ingresa a un estacionamiento, la vas a ver
          en Mis Reservas.
        </p>
        {editing === null && (
          <button
            onClick={() => startEdit()}
            disabled={atLimit}
            title={atLimit ? `Máximo ${MAX_CLIENT_VEHICLES} vehículos` : undefined}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={16} /> Agregar vehículo
          </button>
        )}
      </div>

      {editing !== null && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4" noValidate>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{editing === 'new' ? 'Nuevo vehículo' : 'Editar vehículo'}</h4>
            <button type="button" onClick={() => setEditing(null)} className="rounded p-1 hover:bg-gray-100" aria-label="Cancelar">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('plate', 'Patente *', 'AB 123 CD')}
            <div>
              <label htmlFor="veh-type" className="mb-1 block text-sm font-medium text-gray-700">
                Tipo *
              </label>
              <select
                id="veh-type"
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value as UserVehicleType })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {field('name', 'Nombre (opcional)', 'Ej.: Auto de trabajo')}
            {field('brand', 'Marca (opcional)')}
            {field('model', 'Modelo (opcional)')}
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Guardar
            </button>
          </div>
        </form>
      )}

      {vehicles.length === 0 && editing === null && (
        <p className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">Todavía no registraste vehículos.</p>
      )}

      <ul className="space-y-2">
        {vehicles.map((v) => (
          <li key={v.id} className="flex flex-col gap-2 rounded-2xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Car size={20} className="text-blue-600" />
              <div>
                <p className="font-mono font-bold tracking-wider">{v.plate}</p>
                <p className="text-sm text-gray-600">
                  {[v.name, [v.brand, v.model].filter(Boolean).join(' '), TYPES.find((t) => t.value === v.vehicleType)?.label].filter(Boolean).join(' · ')}
                </p>
                {v.isParked && <p className="text-xs text-green-700">Estacionado ahora</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(v)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => setToDelete(v)}
                disabled={v.isParked}
                title={v.isParked ? 'No se puede eliminar mientras está estacionado' : undefined}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmModal
        isOpen={!!toDelete}
        title="Eliminar vehículo"
        message={`¿Eliminar ${toDelete?.plate ?? ''}? Dejarás de ver sus ingresos en el seguimiento.`}
        confirmText="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => !saving && setToDelete(null)}
      />
    </div>
  );
}

export default ClientVehiclesManager;
