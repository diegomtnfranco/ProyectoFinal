import { IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class AvailabilityQueryDto {
  @ApiProperty({ enum: VehicleType, example: 'car' })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;
}

export class ExitOptionsQueryDto extends AvailabilityQueryDto {
  @ApiProperty({ example: '2026-11-25T13:00:00.000Z', description: 'Ingreso elegido (uno de los horarios devueltos por /availability)' })
  @IsDateString()
  startTime!: string;
}
