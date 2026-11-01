import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { normalizePricing, toPricingView } from './pricing.util';
import { PriceUnit, PricingType } from './parking-profiles.constants';
import { PricingDto } from './dto/pricing.dto';
import { CreateCustomServiceDto } from './dto/custom-service.dto';

describe('normalizePricing', () => {
  it('acepta costo adicional con importe y unidad (redondeo a 2 decimales)', () => {
    const p = normalizePricing({
      type: PricingType.EXTRA_COST,
      amount: 1500.5,
      unit: PriceUnit.PER_USE,
    });
    expect(p).toMatchObject({
      type: 'extra_cost',
      amount: 1500.5,
      unit: 'per_use',
      currency: 'ARS',
    });
  });

  it.each([PricingType.INCLUDED, PricingType.FREE])(
    'acepta %s sin importe',
    (type) => {
      expect(normalizePricing({ type })).toMatchObject({
        type,
        amount: null,
        unit: null,
      });
    },
  );

  it.each([
    [
      'importe negativo',
      { type: PricingType.EXTRA_COST, amount: -10, unit: PriceUnit.FIXED },
    ],
    [
      'importe cero',
      { type: PricingType.EXTRA_COST, amount: 0, unit: PriceUnit.FIXED },
    ],
    ['sin importe', { type: PricingType.EXTRA_COST, unit: PriceUnit.FIXED }],
    ['sin unidad', { type: PricingType.EXTRA_COST, amount: 100 }],
    [
      'más de 2 decimales',
      { type: PricingType.EXTRA_COST, amount: 10.123, unit: PriceUnit.FIXED },
    ],
    ['incluido con importe', { type: PricingType.INCLUDED, amount: 100 }],
    [
      'gratuito con unidad',
      { type: PricingType.FREE, unit: PriceUnit.PER_HOUR },
    ],
    ['moneda distinta', { type: PricingType.FREE, currency: 'USD' }],
    ['sin modalidad', null],
  ])('rechaza %s', (_label, input) => {
    expect(() => normalizePricing(input as any)).toThrow(BadRequestException);
  });

  it('la vista no expone importe para servicios incluidos', () => {
    expect(
      toPricingView({
        type: PricingType.INCLUDED,
        amount: 99,
        unit: PriceUnit.FIXED,
        currency: 'ARS',
      }),
    ).toEqual({
      type: 'included',
      amount: null,
      unit: null,
      currency: 'ARS',
    });
  });
});

describe('DTO validation (class-validator)', () => {
  const errorsOf = async (cls: any, plain: object) =>
    validate(plainToInstance(cls, plain));

  it('rechaza importe negativo en el DTO', async () => {
    const errors = await errorsOf(PricingDto, {
      type: 'extra_cost',
      amount: -1,
      unit: 'fixed',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rechaza modalidad inexistente', async () => {
    expect(
      (await errorsOf(PricingDto, { type: 'maybe' })).length,
    ).toBeGreaterThan(0);
  });

  it('exige título y valida el precio anidado del servicio personalizado', async () => {
    const errors = await errorsOf(CreateCustomServiceDto, {
      title: '',
      pricing: { type: 'extra_cost' },
    });
    const props = errors.map((e) => e.property);
    expect(props).toEqual(expect.arrayContaining(['title', 'pricing']));
  });

  it('acepta un servicio personalizado válido', async () => {
    const errors = await errorsOf(CreateCustomServiceDto, {
      title: 'Inflado',
      conditions: 'Coordinar',
      pricing: { type: 'extra_cost', amount: 500, unit: 'per_vehicle' },
    });
    expect(errors).toHaveLength(0);
  });
});
