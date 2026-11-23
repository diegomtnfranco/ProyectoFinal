import { Column, ValueTransformer } from 'typeorm';
import {
  DEFAULT_CURRENCY,
  PriceUnit,
  PricingType,
} from '../parking-profiles.constants';

/** pg devuelve DECIMAL como string: lo convertimos a number sin perder 2 decimales */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};

/**
 * Columnas de precio compartidas por servicios predefinidos (configuración por
 * estacionamiento) y servicios personalizados. Se embebe sin prefijo.
 */
export class ServicePricing {
  @Column({
    name: 'pricing_type',
    type: 'enum',
    enum: PricingType,
    nullable: true,
  })
  type!: PricingType | null;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  amount!: number | null;

  @Column({ name: 'price_unit', type: 'enum', enum: PriceUnit, nullable: true })
  unit!: PriceUnit | null;

  @Column({
    name: 'currency',
    type: 'varchar',
    length: 3,
    default: DEFAULT_CURRENCY,
  })
  currency!: string;
}
