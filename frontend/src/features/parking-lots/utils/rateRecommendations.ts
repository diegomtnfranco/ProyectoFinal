/**
 * Recomendación de tarifas según los tipos de vehículo registrados por el cliente.
 * Compara valores reales del enum (car | motorcycle | truck | van), nunca nombres visibles.
 *
 * - vehicleTypes === null  → no hay personalización (sin sesión o error al cargar): todas.
 * - sin vehículos           → todas las tarifas (escenario D).
 * - con vehículos           → solo las tarifas de esos tipos (A/B/C), sin duplicar tipos (F).
 * - sin coincidencias       → ninguna tarifa de otros tipos (E). No se inventan precios.
 */
export interface RateLike {
  id: string;
  vehicleType: string;
  price: number;
}

export type RateRecommendation<R extends RateLike> =
  | { mode: "all"; rates: R[] }
  | { mode: "matched"; rates: R[] }
  | { mode: "no-match"; rates: R[]; registeredTypes: string[] };

const TYPE_ORDER = ["car", "motorcycle", "truck", "van"];

const orderOf = (type: string) => {
  const i = TYPE_ORDER.indexOf(type);
  return i === -1 ? TYPE_ORDER.length : i;
};

/** Una tarifa por tipo (la primera recibida) y en orden estable. */
export function uniqueRatesByType<R extends RateLike>(
  rates: readonly R[],
): R[] {
  const seen = new Set<string>();
  const result: R[] = [];
  for (const rate of rates) {
    if (seen.has(rate.vehicleType)) continue;
    seen.add(rate.vehicleType);
    result.push(rate);
  }
  return result.sort((a, b) => orderOf(a.vehicleType) - orderOf(b.vehicleType));
}

export function recommendRates<R extends RateLike>(
  rates: readonly R[] | null | undefined,
  vehicleTypes: readonly string[] | null,
): RateRecommendation<R> {
  const unique = uniqueRatesByType(rates ?? []);
  // Sin tarifas cargadas no hay nada que filtrar: la tarjeta muestra "Consultar tarifas".
  if (vehicleTypes === null || vehicleTypes.length === 0 || unique.length === 0)
    return { mode: "all", rates: unique };

  const registered = [...new Set(vehicleTypes)].sort(
    (a, b) => orderOf(a) - orderOf(b),
  );
  const matched = unique.filter((rate) =>
    registered.includes(rate.vehicleType),
  );
  if (matched.length === 0)
    return { mode: "no-match", rates: [], registeredTypes: registered };
  return { mode: "matched", rates: matched };
}
