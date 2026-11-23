import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LIMITS } from '../parking-profiles.constants';
import { PricingDto } from './pricing.dto';

export class CreateCustomServiceDto {
  @ApiProperty({ maxLength: LIMITS.title, example: 'Inflado de neumáticos' })
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(LIMITS.title)
  title!: string;

  @ApiPropertyOptional({ maxLength: LIMITS.serviceDescription })
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.serviceDescription)
  description?: string | null;

  @ApiPropertyOptional({ maxLength: LIMITS.conditions })
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.conditions)
  conditions?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: PricingDto })
  @ValidateNested()
  @Type(() => PricingDto)
  pricing!: PricingDto;
}

export class UpdateCustomServiceDto {
  @ApiPropertyOptional({ maxLength: LIMITS.title })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El título no puede quedar vacío' })
  @MaxLength(LIMITS.title)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.serviceDescription)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.conditions)
  conditions?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: PricingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing?: PricingDto;
}
