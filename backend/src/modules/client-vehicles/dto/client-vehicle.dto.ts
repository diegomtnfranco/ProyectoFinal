import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

const PLATE_REGEX = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{2,13}[A-Za-z0-9]$/;

export class CreateClientVehicleDto {
  @ApiProperty({ example: 'AB 123 CD' })
  @IsString()
  @IsNotEmpty({ message: 'La patente es obligatoria' })
  @Matches(PLATE_REGEX, {
    message: 'Patente inválida (letras, números y separadores)',
  })
  plate!: string;

  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType, { message: 'Tipo de vehículo inválido' })
  vehicleType!: VehicleType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) name?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) brand?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) model?:
    string | null;
}

export class UpdateClientVehicleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(PLATE_REGEX, {
    message: 'Patente inválida (letras, números y separadores)',
  })
  plate?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType, { message: 'Tipo de vehículo inválido' })
  vehicleType?: VehicleType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) name?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) brand?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) model?:
    string | null;
}

export interface ClientVehicleView {
  id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  plate: string;
  vehicleType: VehicleType;
  /** true si el vehículo tiene un ingreso activo (no se puede eliminar ni cambiar la patente) */
  isParked: boolean;
}

export const MAX_VEHICLES_PER_CLIENT = 3;
