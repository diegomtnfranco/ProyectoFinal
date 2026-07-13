import { ApiProperty } from '@nestjs/swagger';
import { Occupancy } from '../entities/occupancy.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { Space } from 'src/modules/spaces/entities/space.entity';
import { Reservation } from 'src/modules/reservations/entities/reservation.entity';

export class CheckOutResponseDto {
  occupancy!: {
    id: string,
    spaceId: string,
    reservationId: string,
    vehiclePlate: string,
    vehicleType: VehicleType,
    checkInTime: string,
    checkOutTime: string,
    checkedInBy: string,
    checkedOutBy: string,
    totalAmount: number,
    isCompleted: boolean,
    isAnonymous: boolean,
    checkedInViaQr: boolean,
    checkedOutViaQr: boolean,
    createdAt: string,
    updatedAt: string,
    space: Space,
    reservation: Reservation | undefined,

  };
  rate!: {
    id: string,
    VehicleType: VehicleType,
    pricePerHour: number,
  }
}
