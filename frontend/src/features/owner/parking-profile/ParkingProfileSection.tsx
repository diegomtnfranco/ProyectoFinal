import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import { parkingProfileService, toErrorMessage } from '../../../services/parking-profile.service';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmModal } from '../../../shared/components/common/ConfirmModal';
import PricingFields from '../../../shared/components/parking-profile/PricingFields';
import {
  formatPrice,
  formToPricing,
  pricingToForm,
  validatePricingForm,
  type PricingFormState,
} from '../../../shared/components/parking-profile/pricing';
import CustomServiceEditor from './CustomServiceEditor';
import type {
  CustomService,
  CustomServicePayload,
  ParkingProfileAdmin,
  UpdateParkingProfilePayload,
} from '../../../types/parking-profile.types';

const DESCRIPTION_MAX = 2000;
const NOTES_MAX = 500;
const CONDITIONS_MAX = 1000;

interface Draft {
  description: string;
  features: Record<string, { enabled: boolean; notes: string }>;
  services: Record<string, { enabled: boolean; notes: string; conditions: string; pricing: PricingFormState }>;
}

const buildDraft = (p: ParkingProfileAdmin): Draft => ({
  description: p.description ?? '',
  features: Object.fromEntries(p.physicalFeatures.map((f) => [f.code, { enabled: f.enabled, notes: f.notes ?? '' }])),
  services: Object.fromEntries(
    p.services.map((s) => [
      s.code,
      { enabled: s.enabled, notes: s.notes ?? '', conditions: s.conditions ?? '', pricing: pricingToForm(s.pricing) },
    ]),
  ),
});

function SystemBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
      <BadgeCheck size={12} /> EstacionApp
    </span>
  );
}

function SectionTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="flex items-center gap-2 font-semibold text-gray-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs text-white">{n}</span>
        {title}
      </h3>
      {hint && <p className="ml-8 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface ParkingProfileSectionProps {
  parkingLotId: string;
}

/**
 * Administración de la información publicada del estacionamiento seleccionado:
 * descripción, características físicas, servicios predefinidos y personalizados.
 */
function ParkingProfileSection({ parkingLotId }: ParkingProfileSectionProps) {
  const { showSuccess, showError } = useToast();
  const [profile, setProfile] = useState<ParkingProfileAdmin | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string | null>>({});
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<CustomService | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    parkingProfileService
      .getAdmin(parkingLotId)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setDraft(buildDraft(data));
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(toErrorMessage(err, 'No se pudo cargar la información del estacionamiento'));
      });
    return () => {
      cancelled = true;
    };
  }, [parkingLotId, reloadToken]);

  const baseline = useMemo(() => (profile ? JSON.stringify(buildDraft(profile)) : ''), [profile]);
  const isDirty = !!draft && JSON.stringify(draft) !== baseline;

  if (loadError && !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <CircleAlert size={28} className="mx-auto mb-2 opacity-70" />
        <p>{loadError}</p>
        <button
          onClick={() => {
            setLoadError(null);
            setReloadToken((t) => t + 1);
          }}
          className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-8 text-gray-500">
        <LoaderCircle size={18} className="animate-spin" /> Cargando información publicada…
      </div>
    );
  }

  const updateFeature = (code: string, patch: Partial<Draft['features'][string]>) =>
    setDraft((d) => (d ? { ...d, features: { ...d.features, [code]: { ...d.features[code], ...patch } } } : d));

  const updateService = (code: string, patch: Partial<Draft['services'][string]>) => {
    setDraft((d) => (d ? { ...d, services: { ...d.services, [code]: { ...d.services[code], ...patch } } } : d));
    setServiceErrors((e) => ({ ...e, [code]: null }));
  };

  const handleSave = async () => {
    if (saving) return;
    // Validación en cliente (el backend vuelve a validar)
    const errors: Record<string, string | null> = {};
    for (const s of profile.services) {
      const d = draft.services[s.code];
      if (d.enabled || d.pricing.type) errors[s.code] = validatePricingForm(d.pricing);
    }
    const descErr = draft.description.length > DESCRIPTION_MAX ? `Máximo ${DESCRIPTION_MAX} caracteres` : null;
    setServiceErrors(errors);
    setDescriptionError(descErr);
    if (descErr || Object.values(errors).some(Boolean)) {
      showError('Revisá los campos marcados antes de guardar');
      return;
    }

    const payload: UpdateParkingProfilePayload = {
      description: draft.description.trim() || null,
      physicalFeatures: profile.physicalFeatures.map((f) => ({
        code: f.code,
        enabled: draft.features[f.code].enabled,
        notes: draft.features[f.code].notes.trim() || null,
      })),
      services: profile.services.map((s) => {
        const d = draft.services[s.code];
        return {
          code: s.code,
          enabled: d.enabled,
          notes: d.notes.trim() || null,
          conditions: d.conditions.trim() || null,
          pricing: d.pricing.type ? formToPricing(d.pricing) : undefined,
        };
      }),
    };

    setSaving(true);
    try {
      const updated = await parkingProfileService.update(parkingLotId, payload);
      setProfile(updated);
      setDraft(buildDraft(updated));
      showSuccess('Información del estacionamiento guardada');
    } catch (err) {
      showError(toErrorMessage(err, 'No se pudieron guardar los cambios'));
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSubmit = async (payload: CustomServicePayload) => {
    const current = editing;
    try {
      if (current === 'new') {
        const created = await parkingProfileService.createCustomService(parkingLotId, payload);
        setProfile((p) => (p ? { ...p, customServices: [...p.customServices, created] } : p));
        showSuccess('Servicio creado');
      } else if (current) {
        const updated = await parkingProfileService.updateCustomService(parkingLotId, current, payload);
        setProfile((p) =>
          p ? { ...p, customServices: p.customServices.map((c) => (c.id === updated.id ? updated : c)) } : p,
        );
        showSuccess('Servicio actualizado');
      }
      setEditing(null);
    } catch (err) {
      showError(toErrorMessage(err, 'No se pudo guardar el servicio'));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deletingId) return;
    const target = toDelete;
    setDeletingId(target.id);
    try {
      await parkingProfileService.deleteCustomService(parkingLotId, target.id);
      setProfile((p) => (p ? { ...p, customServices: p.customServices.filter((c) => c.id !== target.id) } : p));
      if (editing === target.id) setEditing(null);
      showSuccess('Servicio eliminado');
    } catch (err) {
      showError(toErrorMessage(err, 'No se pudo eliminar el servicio'));
    } finally {
      setDeletingId(null);
      setToDelete(null);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="flex flex-col gap-1 border-b border-gray-100 pb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Building2 size={20} /> Información para clientes
        </h2>
        <p className="text-sm text-gray-500">
          Lo que publiques acá se muestra en la página de reservas de <strong>{profile.parkingLotName}</strong>. Los precios
          son informativos: no se cobran ni modifican tus tarifas de estacionamiento.
        </p>
      </header>

      {/* 1. Información general */}
      <div>
        <SectionTitle n={1} title="Información general" />
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <MapPin size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-gray-700">{profile.address}</p>
            <p className="text-xs text-gray-500">Dirección registrada del estacionamiento (no se edita desde esta sección).</p>
          </div>
        </div>
        <label htmlFor="profile-description" className="mb-1 block text-sm font-medium text-gray-700">
          Descripción <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="profile-description"
          rows={4}
          maxLength={DESCRIPTION_MAX}
          value={draft.description}
          onChange={(e) => {
            setDraft({ ...draft, description: e.target.value });
            setDescriptionError(null);
          }}
          placeholder="Contá a tus clientes cómo es tu estacionamiento, accesos, horarios especiales…"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            descriptionError ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between text-xs">
          <span className="text-red-600">{descriptionError}</span>
          <span className="text-gray-400">
            {draft.description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {/* 2. Características físicas */}
      <div>
        <SectionTitle n={2} title="Características físicas" hint="Podés marcar varias. Usá la aclaración para indicar su alcance (ej.: «solo planta baja»)." />
        <div className="grid gap-3 sm:grid-cols-3">
          {profile.physicalFeatures.map((f) => {
            const d = draft.features[f.code];
            return (
              <div key={f.code} className={`rounded-xl border p-3 transition ${d.enabled ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'}`}>
                <label className="flex cursor-pointer items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => updateFeature(f.code, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    {f.name}
                  </span>
                  <SystemBadge />
                </label>
                {d.enabled && (
                  <input
                    value={d.notes}
                    maxLength={NOTES_MAX}
                    onChange={(e) => updateFeature(f.code, { notes: e.target.value })}
                    placeholder="Aclaración (opcional)"
                    aria-label={`Aclaración de ${f.name}`}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Servicios predefinidos */}
      <div>
        <SectionTitle n={3} title="Servicios predefinidos" hint="Activá solo los que ofrecés. Para publicarlos necesitás indicar su modalidad de cobro." />
        <div className="space-y-3">
          {profile.services.map((s) => {
            const d = draft.services[s.code];
            return (
              <div key={s.code} className={`rounded-xl border p-4 transition ${d.enabled ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 font-medium text-gray-800">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => updateService(s.code, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <Sparkles size={16} className="text-blue-500" />
                    {s.name}
                  </label>
                  <div className="flex items-center gap-2">
                    {!d.enabled && s.pricing && <span className="text-xs text-gray-400">{formatPrice(s.pricing)}</span>}
                    <SystemBadge />
                  </div>
                </div>
                {d.enabled && (
                  <div className="mt-3 space-y-3 pl-6">
                    <PricingFields
                      idPrefix={`svc-${s.code}`}
                      value={d.pricing}
                      onChange={(pricing) => updateService(s.code, { pricing })}
                      error={serviceErrors[s.code]}
                      disabled={saving}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <textarea
                        rows={2}
                        maxLength={NOTES_MAX}
                        value={d.notes}
                        onChange={(e) => updateService(s.code, { notes: e.target.value })}
                        placeholder="Descripción (opcional)"
                        aria-label={`Descripción de ${s.name}`}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        rows={2}
                        maxLength={CONDITIONS_MAX}
                        value={d.conditions}
                        onChange={(e) => updateService(s.code, { conditions: e.target.value })}
                        placeholder="Condiciones (opcional)"
                        aria-label={`Condiciones de ${s.name}`}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guardar secciones 1 a 3 */}
      <div className="sticky bottom-2 z-10 flex flex-col items-stretch justify-end gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center">
        <span className="text-sm text-gray-500 sm:mr-auto">
          {isDirty ? 'Tenés cambios sin guardar en las secciones 1 a 3.' : 'Secciones 1 a 3 guardadas.'}
        </span>
        <button
          type="button"
          disabled={!isDirty || saving}
          onClick={() => setDraft(buildDraft(profile))}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {/* 4. Servicios personalizados */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <SectionTitle n={4} title="Servicios personalizados" hint="Se guardan al instante y pertenecen solo a este estacionamiento." />
          {editing !== 'new' && (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-900"
            >
              <Plus size={16} /> Agregar
            </button>
          )}
        </div>

        <div className="space-y-3">
          {editing === 'new' && <CustomServiceEditor onSubmit={handleCustomSubmit} onCancel={() => setEditing(null)} />}

          {profile.customServices.length === 0 && editing !== 'new' && (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
              Todavía no creaste servicios personalizados.
            </p>
          )}

          {profile.customServices.map((c) =>
            editing === c.id ? (
              <CustomServiceEditor key={c.id} initial={c} onSubmit={handleCustomSubmit} onCancel={() => setEditing(null)} />
            ) : (
              <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Wrench size={15} className="text-violet-500" />
                    <span className="font-medium text-gray-800">{c.title}</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">Personalizado</span>
                    {!c.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">No publicado</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-700">{formatPrice(c.pricing)}</p>
                  {c.description && <p className="mt-1 text-sm text-gray-600">{c.description}</p>}
                  {c.conditions && <p className="mt-1 text-xs text-gray-500">Condiciones: {c.conditions}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(c.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(c)}
                    disabled={deletingId === c.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === c.id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!toDelete}
        title="Eliminar servicio"
        message={`¿Eliminar «${toDelete?.title ?? ''}»? Dejará de mostrarse a los clientes y no se puede deshacer.`}
        confirmText={deletingId ? 'Eliminando…' : 'Eliminar'}
        onConfirm={confirmDelete}
        onCancel={() => !deletingId && setToDelete(null)}
        variant="danger"
      />
    </section>
  );
}

export default ParkingProfileSection;
