import { useState, type FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import PricingFields from '../../../shared/components/parking-profile/PricingFields';
import {
  formToPricing,
  pricingToForm,
  validatePricingForm,
  type PricingFormState,
} from '../../../shared/components/parking-profile/pricing';
import type { CustomService, CustomServicePayload } from '../../../types/parking-profile.types';

interface CustomServiceEditorProps {
  initial?: CustomService | null;
  onSubmit: (payload: CustomServicePayload) => Promise<void>;
  onCancel: () => void;
}

const LIMITS = { title: 100, description: 1000, conditions: 1000 };

const FIELD =
  'w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

/** Formulario de alta/edición de un servicio personalizado */
function CustomServiceEditor({ initial, onSubmit, onCancel }: CustomServiceEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [conditions, setConditions] = useState(initial?.conditions ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [pricing, setPricing] = useState<PricingFormState>(pricingToForm(initial?.pricing ?? null));
  const [errors, setErrors] = useState<{ title?: string; pricing?: string | null }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return; // evita envíos duplicados
    const nextErrors = {
      title: !title.trim() ? 'El título es obligatorio' : title.trim().length > LIMITS.title ? `Máximo ${LIMITS.title} caracteres` : undefined,
      pricing: validatePricingForm(pricing),
    };
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.pricing) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        conditions: conditions.trim() || null,
        isActive,
        pricing: formToPricing(pricing),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const idPrefix = initial?.id ?? 'new-service';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-blue-400 bg-blue-50/40 p-4" noValidate>
      <p className="font-bold text-gray-900">{initial ? 'Editar servicio' : 'Nuevo servicio'}</p>

      <div>
        <label htmlFor={`${idPrefix}-title`} className="mb-1.5 block text-sm font-bold text-gray-900">
          Título
        </label>
        <input
          id={`${idPrefix}-title`}
          value={title}
          maxLength={LIMITS.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej.: Inflado de neumáticos"
          className={`${FIELD} ${errors.title ? 'border-red-400' : 'border-gray-300'}`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      <div className="grid gap-3 cq-md:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-description`} className="mb-1.5 block text-sm font-bold text-gray-900">
            Descripción <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea
            id={`${idPrefix}-description`}
            value={description}
            maxLength={LIMITS.description}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className={`${FIELD} border-gray-300`}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-conditions`} className="mb-1.5 block text-sm font-bold text-gray-900">
            Condiciones <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea
            id={`${idPrefix}-conditions`}
            value={conditions}
            maxLength={LIMITS.conditions}
            rows={2}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="Ej.: sujeto a coordinación, solo de lunes a viernes"
            className={`${FIELD} border-gray-300`}
          />
        </div>
      </div>

      <PricingFields idPrefix={idPrefix} value={pricing} onChange={setPricing} error={errors.pricing} disabled={submitting} />

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-900">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
        Publicado <span className="text-gray-500">(visible para los clientes)</span>
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-blue-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting && <LoaderCircle size={16} className="animate-spin" />}
          {submitting ? 'Guardando…' : 'Guardar servicio'}
        </button>
      </div>
    </form>
  );
}

export default CustomServiceEditor;
