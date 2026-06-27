import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, Matches, MaxLength, MinLength } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class AnonymousCheckInDto {
  @ApiProperty({ description: 'Token del QR de check-in' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'ABC123', description: 'Patente del vehículo' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, { message: 'La patente solo puede contener letras mayúsculas y números' })
  vehiclePlate!: string;

  @ApiProperty({ enum: VehicleType, description: 'Tipo de vehículo' })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;
}