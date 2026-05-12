import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class FilterReservationsDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  spaceId?: string;

  @IsUUID()
  @IsOptional()
  parkingLotId?: string;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}