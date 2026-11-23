import { centsToDecimalString, decimalToCents, formatArs } from './money.util';

describe('money.util', () => {
  it('convierte decimales de PostgreSQL a centavos sin floats', () => {
    expect(decimalToCents('7000.00')).toBe(700000);
    expect(decimalToCents('7000')).toBe(700000);
    expect(decimalToCents('0.1')).toBe(10);
    expect(decimalToCents('1234.56')).toBe(123456);
    expect(decimalToCents('0.005')).toBe(1);
    expect(decimalToCents('0.004')).toBe(0);
  });

  it('acepta numbers sin errores de representación', () => {
    expect(decimalToCents(0.1 + 0.2)).toBe(30);
    expect(decimalToCents(7000)).toBe(700000);
    expect(decimalToCents(19.99)).toBe(1999);
  });

  it('devuelve null para vacíos y rechaza texto inválido', () => {
    expect(decimalToCents(null)).toBeNull();
    expect(decimalToCents(undefined)).toBeNull();
    expect(() => decimalToCents('abc')).toThrow();
  });

  it('formatea centavos', () => {
    expect(centsToDecimalString(700050)).toBe('7000.50');
    expect(centsToDecimalString(5)).toBe('0.05');
    expect(formatArs(700000)).toBe('$ 7.000');
    expect(formatArs(123456789)).toBe('$ 1.234.567,89');
  });
});
