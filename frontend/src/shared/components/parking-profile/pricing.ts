import { PriceUnit, PricingType } from '../../../types/parking-profile.types';
import type { Pricing, PriceUnitValue, PricingInput, PricingTypeValue } from '../../../types/parking-profile.types';

export const PRICING_TYPE_LABEL: Record<PricingTypeValue, string> = {
  [PricingType.INCLUDED]: 'Incluido en la tarifa',
  [PricingType.FREE]: 'Gratuito',
  [PricingType.EXTRA_COST]: 'Costo adicional',
};

export const PRICE_UNIT_LABEL: Record<PriceUnitValue, string> = {
  [PriceUnit.PER_VEHICLE]: 'por vehículo',
  [PriceUnit.PER_USE]: 'por uso',
  [PriceUnit.PER_HOUR]: 'por hora',
  [PriceUnit.FIXED]: 'precio fijo',
};

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

export const formatPrice = (pricing: Pricing | null): string => {
  if (!pricing) return 'Sin modalidad definida';
  if (pricing.type !== PricingType.EXTRA_COST) return PRICING_TYPE_LABEL[pricing.type];
  if (pricing.amount == null || !pricing.unit) return PRICING_TYPE_LABEL[pricing.type];
  const amount = money.format(pricing.amount);
  return pricing.unit === PriceUnit.FIXED ? `${amount} (precio fijo)` : `${amount} ${PRICE_UNIT_LABEL[pricing.unit]}`;
};

/** Estado editable del formulario de precio (los inputs trabajan con strings) */
export interface PricingFormState {
  type: PricingTypeValue | '';
  amount: string;
  unit: PriceUnitValue | '';
}

export const pricingToForm = (pricing: Pricing | null): PricingFormState => ({
  type: pricing?.type ?? '',
  amount: pricing?.amount != null ? String(pricing.amount) : '',
  unit: pricing?.unit ?? '',
});

/** Valida en el cliente con las mismas reglas que el backend. Devuelve error o null. */
export const validatePricingForm = (form: PricingFormState): string | null => {
  if (!form.type) return 'Elegí la modalidad de cobro';
  if (form.type !== PricingType.EXTRA_COST) return null;
  const raw = form.amount.trim().replace(',', '.');
  if (!raw) return 'Ingresá el importe';
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return 'El importe debe ser un número positivo con hasta 2 decimales';
  const amount = Number(raw);
  if (amount <= 0) return 'El importe debe ser mayor a 0 (si no tiene costo, elegí "Gratuito")';
  if (amount > 99_999_999.99) return 'El importe es demasiado alto';
  if (!form.unit) return 'Elegí la unidad del costo';
  return null;
};

/** Convierte el formulario en payload sin combinaciones contradictorias */
export const formToPricing = (form: PricingFormState): PricingInput => {
  if (form.type === PricingType.EXTRA_COST) {
    return {
      type: form.type,
      amount: Number(form.amount.trim().replace(',', '.')),
      unit: form.unit as PriceUnitValue,
    };
  }
  return { type: form.type as PricingTypeValue };
};
