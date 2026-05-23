import { SpaceStatus } from '../../spaces/entities/space.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class EmployeeSpaceDto {
  id!: string;
  spaceNumber!: string;
  status!: SpaceStatus;
  allowedVehicleTypes!: VehicleType[];
  isReserved!: boolean;
  reservedUntil?: Date | null;
  occupiedSince?: Date | null;
  occupiedByVehiclePlate?: string  | null;
  occupiedByVehicleType?: VehicleType | null;
  metadata?: {
    floor?: number;
    zone?: string;
    widthMeters?: number;
    lengthMeters?: number;
    hasEvCharger?: boolean;
    isCovered?: boolean;
  };
}

export class EmployeeParkingLotResponseDto {
  id!: string;
  name!: string;
  address!: string;
  latitude!: number;
  longitude!: number;
  openTime!: string;
  closeTime!: string;

  stats!: {
    totalSpaces: number;
    availableSpaces: number;
    occupiedSpaces: number;
    reservedSpaces: number;
    maintenanceSpaces: number;
  };

  spaces!: EmployeeSpaceDto[];
}