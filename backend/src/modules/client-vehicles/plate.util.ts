/**
 * Normaliza una patente solo para COMPARAR: mayúsculas, sin espacios, guiones,
 * puntos, barras ni otros separadores. El valor original nunca se modifica.
 *   "ab 123-cd" -> "AB123CD"
 */
export function normalizePlate(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Misma normalización en SQL (para columnas que guardan el valor original) */
export const sqlNormalizedPlate = (column: string) =>
  `regexp_replace(upper(${column}), '[^A-Z0-9]', '', 'g')`;
