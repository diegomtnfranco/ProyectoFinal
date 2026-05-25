import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { SpaceStatus } from '../../spaces/entities/space.entity';

export class ActiveOccupancySpaceDto {
  id!: string;
  spaceNumber!: string;
  status!: SpaceStatus;
}

export class ActiveOccupancyResponseDto {
  id!: string;
  spaceId!: string;
  space!: ActiveOccupancySpaceDto;
  vehiclePlate!: string;
  vehicleType!: VehicleType;
  checkInTime!: Date;
  checkedInBy!: string;
  totalAmount?: number;
}