import { PriceUnit, PricingType } from '../../../types/parking-profile.types';
import type { PriceUnitValue, PricingTypeValue } from '../../../types/parking-profile.types';
import { PRICE_UNIT_LABEL, PRICING_TYPE_LABEL, type PricingFormState } from './pricing';

interface PricingFieldsProps {
  idPrefix: string;
  value: PricingFormState;
  onChange: (value: PricingFormState) => void;
  error?: string | null;
  disabled?: boolean;
}

const TYPES = [PricingType.INCLUDED, PricingType.FREE, PricingType.EXTRA_COST] as const;
const UNITS = [PriceUnit.PER_VEHICLE, PriceUnit.PER_USE, PriceUnit.PER_HOUR, PriceUnit.FIXED] as const;

/** Modalidad excluyente (radio) + importe/unidad solo para costo adicional */
function PricingFields({ idPrefix, value, onChange, error, disabled }: PricingFieldsProps) {
  const setType = (type: PricingTypeValue) =>
    onChange(type === PricingType.EXTRA_COST ? { ...value, type } : { type, amount: '', unit: '' });

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium text-gray-700">Modalidad de cobro</legend>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((type) => (
          <label
            key={type}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition ${
              value.type === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={`${idPrefix}-pricing-type`}
              value={type}
              checked={value.type === type}
              onChange={() => setType(type)}
              className="sr-only"
            />
            {PRICING_TYPE_LABEL[type]}
          </label>
        ))}
      </div>

      {value.type === PricingType.EXTRA_COST && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-amount`} className="mb-1 block text-xs text-gray-500">
              Importe (ARS)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                id={`${idPrefix}-amount`}
                type="text"
                inputMode="decimal"
                value={value.amount}
                onChange={(e) => onChange({ ...value, amount: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-unit`} className="mb-1 block text-xs text-gray-500">
              Unidad
            </label>
            <select
              id={`${idPrefix}-unit`}
              value={value.unit}
              onChange={(e) => onChange({ ...value, unit: e.target.value as PriceUnitValue | '' })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Elegí una unidad</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {PRICE_UNIT_LABEL[u].charAt(0).toUpperCase() + PRICE_UNIT_LABEL[u].slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {value.type === PricingType.INCLUDED && (
        <p className="text-xs text-gray-500">Se informa como parte de la tarifa de estacionamiento, sin importe propio.</p>
      )}
      {value.type === PricingType.FREE && <p className="text-xs text-gray-500">Se informa como servicio sin costo.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}

export default PricingFields;
