import { formatPrice } from '../parking-profile/pricing';
import { PricingType } from '../../../types/parking-profile.types';
import type { Pricing } from '../../../types/parking-profile.types';

export interface ServiceOption {
  key: string;
  name: string;
  pricing: Pricing | null;
  description?: string | null;
  conditions?: string | null;
  /** Seleccionado antes y ya no ofrecido: se muestra para poder quitarlo */
  noLongerOffered?: boolean;
}

interface ServiceCheckboxListProps {
  options: ServiceOption[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
  /** Muestra descripción y condiciones (pantalla del cliente) */
  showDetails?: boolean;
}

const badgeClass = (pricing: Pricing | null) => {
  if (!pricing) return 'bg-gray-100 text-gray-600';
  if (pricing.type === PricingType.EXTRA_COST) return 'bg-amber-100 text-amber-800';
  if (pricing.type === PricingType.INCLUDED) return 'bg-green-100 text-green-700';
  return 'bg-teal-100 text-teal-700';
};

/** Lista de servicios opcionales con checkbox (ingreso QR, ingreso manual y edición) */
function ServiceCheckboxList({ options, selected, onChange, disabled, showDetails = false }: ServiceCheckboxListProps) {
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  return (
    <ul className="space-y-2">
      {options.map((o) => {
        const checked = selected.includes(o.key);
        return (
          <li key={o.key}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(o.key)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">{o.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(o.pricing)}`}>{formatPrice(o.pricing)}</span>
                </span>
                {o.noLongerOffered && (
                  <span className="mt-1 block text-xs text-amber-700">Ya no se ofrece: se conserva el precio acordado al seleccionarlo.</span>
                )}
                {showDetails && o.description && <span className="mt-1 block text-sm text-gray-600">{o.description}</span>}
                {showDetails && o.conditions && <span className="mt-1 block text-xs text-gray-500">Condiciones: {o.conditions}</span>}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default ServiceCheckboxList;
