import { IsUUID, IsEnum, IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class CreateReservationDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;  // Opcional: si se omite, se toma del usuario autenticado

  @IsUUID()
  spaceId!: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsString()
  vehiclePlate!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;  // Opcional: se calcula automáticamente
}