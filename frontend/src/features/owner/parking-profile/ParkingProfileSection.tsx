import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
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

/* Estilos neutros compartidos */
const FIELD =
  'w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
const BTN_EDIT =
  'inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 ' +
  'transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300';
const BTN_DELETE =
  'inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 ' +
  'transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200';
const CHECKBOX = 'h-4 w-4 flex-shrink-0 rounded accent-blue-600';
/** Borde de una fila según esté activa o no */
const rowTone = (active: boolean) =>
  active ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 hover:border-blue-200';

function SubTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      {hint && <p className="mt-0.5 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

interface ParkingProfileSectionProps {
  parkingLotId: string;
}

/**
 * Administración de la información publicada del estacionamiento seleccionado:
 * descripción, características físicas y servicios (predefinidos y personalizados en una sola lista).
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
      <div className="text-sm">
        <p className="text-red-700">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setReloadToken((t) => t + 1);
          }}
          className="mt-2 font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <LoaderCircle size={16} className="animate-spin" /> Cargando información publicada…
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
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Se muestra en la página de reservas de {profile.parkingLotName}. Los precios son informativos: no se cobran ni modifican tus
        tarifas de estacionamiento.
      </p>

      {/* Información general */}
      <div>
        <SubTitle title="Información general" />
        <div className="mb-6 rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-sm font-bold text-gray-900">Dirección</p>
          <p className="text-sm text-gray-900">{profile.address}</p>
          <p className="mt-0.5 text-xs text-gray-500">No se edita desde esta sección.</p>
        </div>
        <label htmlFor="profile-description" className="mb-2 block text-xl font-bold text-gray-900">
          Descripción <span className="font-normal text-gray-500">(opcional)</span>
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
          className={`${FIELD} ${descriptionError ? 'border-red-400' : 'border-gray-300'}`}
        />
        <div className="mt-1 flex justify-between text-xs">
          <span className="text-red-600">{descriptionError}</span>
          <span className="text-gray-500">
            {draft.description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {/* Características físicas */}
      <div>
        <SubTitle title="Características físicas" hint="Podés marcar varias. Usá la aclaración para indicar su alcance (ej.: «solo planta baja»)." />
        {/* Una debajo de la otra, a todo el ancho; la aclaración va al costado cuando hay lugar */}
        <div className="flex flex-col gap-3">
          {profile.physicalFeatures.map((f) => {
            const d = draft.features[f.code];
            return (
              <div
                key={f.code}
                className={`flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors cq-md:min-h-[58px] cq-md:flex-row cq-md:items-center cq-md:gap-4 ${rowTone(d.enabled)}`}
              >
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-gray-900 cq-md:w-56 cq-md:flex-none">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => updateFeature(f.code, { enabled: e.target.checked })}
                    className={CHECKBOX}
                  />
                  {f.name}
                </label>
                {d.enabled && (
                  <input
                    value={d.notes}
                    maxLength={NOTES_MAX}
                    onChange={(e) => updateFeature(f.code, { notes: e.target.value })}
                    placeholder="Aclaración (opcional)"
                    aria-label={`Aclaración de ${f.name}`}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cq-md:flex-1"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Servicios: predefinidos y personalizados en una sola lista */}
      <div>
        <SubTitle
          title="Servicios"
          hint="Activá los que ofrecés e indicá su modalidad de cobro. Los servicios que agregás vos se guardan al instante."
        />
        <div className="space-y-3">
          {/* Predefinidos: se guardan con «Guardar cambios» */}
          {profile.services.map((s) => {
            const d = draft.services[s.code];
            return (
              <div key={s.code} className={`rounded-xl border p-4 transition-colors ${rowTone(d.enabled)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2.5 font-semibold text-gray-900">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => updateService(s.code, { enabled: e.target.checked })}
                      className={CHECKBOX}
                    />
                    {s.name}
                  </label>
                  {!d.enabled && s.pricing && <span className="text-xs text-gray-500">{formatPrice(s.pricing)}</span>}
                </div>
                {d.enabled && (
                  <div className="mt-4 space-y-3 cq-sm:pl-[26px]">
                    <PricingFields
                      idPrefix={`svc-${s.code}`}
                      value={d.pricing}
                      onChange={(pricing) => updateService(s.code, { pricing })}
                      error={serviceErrors[s.code]}
                      disabled={saving}
                    />
                    <div className="grid gap-2 cq-md:grid-cols-2">
                      <textarea
                        rows={2}
                        maxLength={NOTES_MAX}
                        value={d.notes}
                        onChange={(e) => updateService(s.code, { notes: e.target.value })}
                        placeholder="Descripción (opcional)"
                        aria-label={`Descripción de ${s.name}`}
                        className={`${FIELD} border-gray-300`}
                      />
                      <textarea
                        rows={2}
                        maxLength={CONDITIONS_MAX}
                        value={d.conditions}
                        onChange={(e) => updateService(s.code, { conditions: e.target.value })}
                        placeholder="Condiciones (opcional)"
                        aria-label={`Condiciones de ${s.name}`}
                        className={`${FIELD} border-gray-300`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Personalizados: se guardan al instante */}
          {profile.customServices.map((c) =>
            editing === c.id ? (
              <CustomServiceEditor key={c.id} initial={c} onSubmit={handleCustomSubmit} onCancel={() => setEditing(null)} />
            ) : (
              <div
                key={c.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 transition-colors ${rowTone(c.isActive)}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {c.title}
                    {!c.isActive && <span className="ml-2 text-xs font-normal text-gray-500">No publicado</span>}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatPrice(c.pricing)}</p>
                  {c.description && <p className="mt-1 text-sm text-gray-900">{c.description}</p>}
                  {c.conditions && <p className="mt-1 text-xs text-gray-500">Condiciones: {c.conditions}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setEditing(c.id)} className={BTN_EDIT}>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(c)}
                    disabled={deletingId === c.id}
                    className={BTN_DELETE}
                  >
                    {deletingId === c.id && <LoaderCircle size={14} className="animate-spin" />} Eliminar
                  </button>
                </div>
              </div>
            ),
          )}

          {editing === 'new' ? (
            <CustomServiceEditor onSubmit={handleCustomSubmit} onCancel={() => setEditing(null)} />
          ) : (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="inline-flex items-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors
                hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              Agregar servicio
            </button>
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

      {/* Guardar descripción, características y servicios activados */}
      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <span className={`mr-auto text-sm ${isDirty ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
          {isDirty ? 'Tenés cambios sin guardar.' : 'Sin cambios.'}
        </span>
        <button
          type="button"
          disabled={!isDirty || saving}
          onClick={() => setDraft(buildDraft(profile))}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

export default ParkingProfileSection;
