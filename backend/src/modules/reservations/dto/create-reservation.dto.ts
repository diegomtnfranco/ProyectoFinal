import { IsUUID, IsEnum, IsString, IsDateString } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class CreateReservationDto {
  @IsUUID()
  parkingLotId!: string;  // ← Cambiar: el cliente elige el estacionamiento, no el espacio

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsString()
  vehiclePlate!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;
}
