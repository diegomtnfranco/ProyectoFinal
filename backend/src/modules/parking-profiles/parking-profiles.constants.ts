/** Tipo de opción del catálogo global de EstacionApp */
export enum CatalogOptionKind {
  PHYSICAL_FEATURE = 'physical_feature',
  SERVICE = 'service',
}

/**
 * Modalidad económica de un servicio. Son mutuamente excluyentes:
 * - included: incluido en la tarifa de estacionamiento (sin importe propio)
 * - free: gratuito (sin importe)
 * - extra_cost: costo adicional (requiere importe > 0 y unidad)
 */
export enum PricingType {
  INCLUDED = 'included',
  FREE = 'free',
  EXTRA_COST = 'extra_cost',
}

/** Unidad del importe cuando el servicio tiene costo adicional */
export enum PriceUnit {
  PER_VEHICLE = 'per_vehicle',
  PER_USE = 'per_use',
  PER_HOUR = 'per_hour',
  FIXED = 'fixed',
}

/** Moneda: el proyecto trabaja en pesos argentinos (es-AR) */
export const DEFAULT_CURRENCY = 'ARS';

export const PRICE_MAX = 99_999_999.99; // decimal(10,2)

export const LIMITS = {
  description: 2000,
  title: 100,
  notes: 500,
  serviceDescription: 1000,
  conditions: 1000,
  customServicesPerLot: 30,
} as const;

/**
 * Catálogo inicial. El `code` es la identidad estable: se inserta una sola vez
 * (INSERT ... ON CONFLICT DO NOTHING) y nunca se borra desde la aplicación.
 */
export const CATALOG_SEED: Array<{
  code: string;
  kind: CatalogOptionKind;
  name: string;
  description: string | null;
  sortOrder: number;
}> = [
  {
    code: 'covered',
    kind: CatalogOptionKind.PHYSICAL_FEATURE,
    name: 'Techado',
    description: 'Sectores con techo',
    sortOrder: 10,
  },
  {
    code: 'shade_net',
    kind: CatalogOptionKind.PHYSICAL_FEATURE,
    name: 'Media sombra',
    description: 'Sectores con media sombra',
    sortOrder: 20,
  },
  {
    code: 'open_air',
    kind: CatalogOptionKind.PHYSICAL_FEATURE,
    name: 'Al aire libre',
    description: 'Sectores descubiertos',
    sortOrder: 30,
  },
  {
    code: 'car_wash',
    kind: CatalogOptionKind.SERVICE,
    name: 'Limpieza de vehículos',
    description: null,
    sortOrder: 10,
  },
  {
    code: 'helmet_storage',
    kind: CatalogOptionKind.SERVICE,
    name: 'Custodia de cascos',
    description: null,
    sortOrder: 20,
  },
];

/**
 * Modalidad de cobro cuando un vehículo queda adentro después del cierre.
 * - hourly: se sigue cobrando por hora (comportamiento histórico).
 * - special: cada noche (cierre → reapertura) se cobra un importe fijo que
 *   reemplaza las horas de ese tramo.
 */
export enum NightRateMode {
  HOURLY = 'hourly',
  SPECIAL = 'special',
}

/** Tolerancia fija después del cierre (decisión de negocio confirmada) */
export const NIGHT_TOLERANCE_MINUTES = 15;

/** Zona horaria del negocio para interpretar openTime/closeTime */
export const BUSINESS_TIME_ZONE = 'America/Argentina/Buenos_Aires';
