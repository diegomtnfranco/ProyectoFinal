import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LIMITS } from '../parking-profiles.constants';
import { PricingDto } from './pricing.dto';

const CODE_REGEX = /^[a-z0-9_]{1,50}$/;

export class FeatureSelectionDto {
  @ApiProperty({ example: 'covered' })
  @IsString()
  @Matches(CODE_REGEX, { message: 'Código de característica inválido' })
  code!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    description: 'Aclaración del alcance (ej. "solo planta baja")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.notes)
  notes?: string | null;
}

export class ServiceSelectionDto {
  @ApiProperty({ example: 'car_wash' })
  @IsString()
  @Matches(CODE_REGEX, { message: 'Código de servicio inválido' })
  code!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.notes)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.conditions)
  conditions?: string | null;

  @ApiPropertyOptional({
    type: PricingDto,
    description: 'Obligatorio si enabled = true',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing?: PricingDto | null;
}

/** PUT: solo se modifican las claves enviadas */
export class UpdateParkingProfileDto {
  @ApiPropertyOptional({ nullable: true, maxLength: LIMITS.description })
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.description)
  description?: string | null;

  @ApiPropertyOptional({ type: [FeatureSelectionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FeatureSelectionDto)
  physicalFeatures?: FeatureSelectionDto[];

  @ApiPropertyOptional({ type: [ServiceSelectionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ServiceSelectionDto)
  services?: ServiceSelectionDto[];
}
