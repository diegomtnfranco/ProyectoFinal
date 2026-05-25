import { IsUUID, IsString, IsEnum, IsOptional } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class CheckInDto {
  @IsUUID()
  spaceId!: string;

  @IsString()
  vehiclePlate!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsUUID()
  @IsOptional()
  reservationId?: string;
}