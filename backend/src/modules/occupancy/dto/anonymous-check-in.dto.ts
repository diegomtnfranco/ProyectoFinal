import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class AnonymousCheckInDto {
  @ApiProperty({ description: 'Token del QR de check-in' })
  @IsString()
  token!: string;

  @ApiProperty({ enum: VehicleType, description: 'Tipo de vehículo' })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;
}