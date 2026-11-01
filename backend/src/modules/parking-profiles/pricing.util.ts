import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_CURRENCY,
  PRICE_MAX,
  PriceUnit,
  PricingType,
} from './parking-profiles.constants';
import { ServicePricing } from './entities/service-pricing.embedded';
import type { PricingDto } from './dto/pricing.dto';
import type { PricingView } from './dto/parking-profile-response.dto';

const VALID_TYPES = Object.values(PricingType);
const VALID_UNITS = Object.values(PriceUnit);

/**
 * Valida y normaliza la modalidad económica. Segunda línea de defensa además
 * de class-validator: rechaza combinaciones contradictorias.
 */
export function normalizePricing(
  input: PricingDto | null | undefined,
): ServicePricing {
  if (!input || !input.type) {
    throw new BadRequestException('Indicá la modalidad de cobro del servicio');
  }
  if (!VALID_TYPES.includes(input.type)) {
    throw new BadRequestException('Modalidad de cobro inválida');
  }
  if (
    input.currency !== undefined &&
    input.currency !== null &&
    input.currency !== DEFAULT_CURRENCY
  ) {
    throw new BadRequestException(`La moneda debe ser ${DEFAULT_CURRENCY}`);
  }

  const hasAmount = input.amount !== undefined && input.amount !== null;
  const hasUnit = input.unit !== undefined && input.unit !== null;
  const pricing = new ServicePricing();
  pricing.type = input.type;
  pricing.currency = DEFAULT_CURRENCY;

  if (input.type === PricingType.EXTRA_COST) {
    const amount = Number(input.amount);
    if (!hasAmount || !Number.isFinite(amount)) {
      throw new BadRequestException(
        'Un servicio con costo adicional requiere un importe',
      );
    }
    if (amount <= 0) {
      throw new BadRequestException(
        'El importe debe ser mayor a 0 (si no tiene costo, marcalo como gratuito)',
      );
    }
    if (amount > PRICE_MAX) {
      throw new BadRequestException('El importe es demasiado alto');
    }
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
      throw new BadRequestException(
        'El importe admite como máximo 2 decimales',
      );
    }
    if (!hasUnit || !VALID_UNITS.includes(input.unit as PriceUnit)) {
      throw new BadRequestException(
        'Indicá la unidad del costo (por vehículo, por uso, por hora o precio fijo)',
      );
    }
    pricing.amount = Math.round(amount * 100) / 100;
    pricing.unit = input.unit as PriceUnit;
    return pricing;
  }

  // included / free: no pueden tener importe ni unidad
  if (hasAmount || hasUnit) {
    const label =
      input.type === PricingType.INCLUDED
        ? 'incluido en la tarifa'
        : 'gratuito';
    throw new BadRequestException(
      `Un servicio ${label} no puede tener importe ni unidad de cobro`,
    );
  }
  pricing.amount = null;
  pricing.unit = null;
  return pricing;
}

/** Columnas vacías para características físicas o servicios sin configurar */
export function emptyPricing(): ServicePricing {
  const pricing = new ServicePricing();
  pricing.type = null;
  pricing.amount = null;
  pricing.unit = null;
  pricing.currency = DEFAULT_CURRENCY;
  return pricing;
}

export function toPricingView(
  pricing: ServicePricing | null | undefined,
): PricingView | null {
  if (!pricing || !pricing.type) return null;
  return {
    type: pricing.type,
    amount:
      pricing.type === PricingType.EXTRA_COST && pricing.amount != null
        ? Number(pricing.amount)
        : null,
    unit: pricing.type === PricingType.EXTRA_COST ? pricing.unit : null,
    currency: pricing.currency || DEFAULT_CURRENCY,
  };
}

/** Recorta texto opcional; vacío => null */
export function cleanText(
  value: unknown,
  max: number,
  field: string,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string')
    throw new BadRequestException(`${field} debe ser texto`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max)
    throw new BadRequestException(`${field} supera los ${max} caracteres`);
  return trimmed;
}
