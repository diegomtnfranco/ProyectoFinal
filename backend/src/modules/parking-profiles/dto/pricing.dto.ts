import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  DEFAULT_CURRENCY,
  PRICE_MAX,
  PriceUnit,
  PricingType,
} from '../parking-profiles.constants';

export class PricingDto {
  @ApiProperty({ enum: PricingType })
  @IsEnum(PricingType, {
    message: 'La modalidad debe ser included, free o extra_cost',
  })
  type!: PricingType;

  @ApiPropertyOptional({
    description: 'Obligatorio y > 0 solo si type = extra_cost',
    example: 1500,
  })
  @ValidateIf(
    (o: PricingDto) =>
      o.type === PricingType.EXTRA_COST ||
      (o.amount !== undefined && o.amount !== null),
  )
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'El importe debe ser un número con hasta 2 decimales' },
  )
  @Min(0.01, { message: 'El importe debe ser mayor a 0' })
  @Max(PRICE_MAX, { message: 'El importe es demasiado alto' })
  amount?: number | null;

  @ApiPropertyOptional({
    enum: PriceUnit,
    description: 'Obligatorio solo si type = extra_cost',
  })
  @ValidateIf(
    (o: PricingDto) =>
      o.type === PricingType.EXTRA_COST ||
      (o.unit !== undefined && o.unit !== null),
  )
  @IsEnum(PriceUnit, {
    message: 'La unidad debe ser per_vehicle, per_use, per_hour o fixed',
  })
  unit?: PriceUnit | null;

  @ApiPropertyOptional({ enum: [DEFAULT_CURRENCY], default: DEFAULT_CURRENCY })
  @IsOptional()
  @IsIn([DEFAULT_CURRENCY], {
    message: `La moneda debe ser ${DEFAULT_CURRENCY}`,
  })
  currency?: string;
}
