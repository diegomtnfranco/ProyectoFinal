// src/modules/parking-lots/dto/parking-lot-owner-response.dto.ts
import { SpaceStatus } from '../../spaces/entities/space.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { ApiProperty } from 'node_modules/@nestjs/swagger/dist/decorators/api-property.decorator';

export class SpaceOwnerDto {
  id!: string;
  spaceNumber!: string;
  status!: SpaceStatus;
  allowedVehicleTypes!: VehicleType[];
  isReserved!: boolean;
  reservedUntil?: Date | null;
  occupiedSince?: Date | null;
  occupiedByVehiclePlate?: string | null;
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

export class ParkingLotOwnerResponseDto {
  id!: string;
  name!: string;
  address!: string;
  latitude!: number;
  longitude!: number;
  openTime!: string;
  closeTime!: string;
  settings!: {
    allowOnlineReservations: boolean;
    cancellationMinutesBefore: number;
    reservationHoldMinutes: number;
  };
  isActive!: boolean;

  stats!: {
    totalSpaces: number;
    availableSpaces: number;
    occupiedSpaces: number;
    reservedSpaces: number;
    maintenanceSpaces: number;
  };

  spaces!: SpaceOwnerDto[];

  rates?: Array<{
    vehicleType: VehicleType;
    pricePerHour: number;
  }>;
  @ApiProperty({ example: 'https://example.com/images/garaje-centro.jpg', nullable: true })
    imageUrl?: string;
}