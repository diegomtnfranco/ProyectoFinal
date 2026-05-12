import { IsUUID, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { RateType } from '../entities/rate.entity';

export class CreateRateDto {
  @IsUUID()
  parkingLotId!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsNumber()
  @Min(0)
  pricePerHour!: number;

  @IsEnum(RateType)
  @IsOptional()
  rateType?: RateType;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;
}