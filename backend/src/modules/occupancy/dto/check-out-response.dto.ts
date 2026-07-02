import { ApiProperty } from '@nestjs/swagger';
import { Occupancy } from '../entities/occupancy.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class CheckOutResponseDto {
  occupancy!:Occupancy;
  rate!:{
        id: string,
        VehicleType: VehicleType,
        pricePerHour: number,
      }
}
