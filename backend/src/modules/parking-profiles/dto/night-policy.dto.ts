import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, Max, Min, ValidateIf } from 'class-validator';
import { NightRateMode, PRICE_MAX } from '../parking-profiles.constants';

export class UpdateNightPolicyDto {
  @ApiProperty({ enum: NightRateMode })
  @IsEnum(NightRateMode, { message: 'La modalidad debe ser hourly o special' })
  mode!: NightRateMode;

  @ApiPropertyOptional({
    description: 'Obligatorio y > 0 si mode = special',
    example: 5000,
  })
  @ValidateIf(
    (o: UpdateNightPolicyDto) =>
      o.mode === NightRateMode.SPECIAL ||
      (o.nightAmount !== undefined && o.nightAmount !== null),
  )
  @IsNumber(
    { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
    { message: 'El importe nocturno debe ser un número con hasta 2 decimales' },
  )
  @Min(0.01, { message: 'El importe nocturno debe ser mayor a 0' })
  @Max(PRICE_MAX, { message: 'El importe nocturno es demasiado alto' })
  nightAmount?: number | null;
}

export interface NightPolicyView {
  parkingLotId: string;
  mode: NightRateMode;
  nightAmount: number | null;
  toleranceMinutes: number;
  openTime: string;
  closeTime: string;
  /** true si openTime === closeTime (se interpreta como abierto 24 h: no hay noche) */
  isOpen24h: boolean;
  updatedAt: Date | null;
}
