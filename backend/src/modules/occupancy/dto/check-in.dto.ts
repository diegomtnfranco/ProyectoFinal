import { IsUUID, IsString, IsEnum, IsOptional, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';
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

  /** Opcional: servicios solicitados ('catalog:<code>' | 'custom:<uuid>') */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  serviceKeys?: string[];
}