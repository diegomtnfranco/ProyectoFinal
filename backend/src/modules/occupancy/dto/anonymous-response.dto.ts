import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class AnonymousCheckInResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  spaceNumber!: string;

  @ApiProperty()
  vehiclePlate!: string;

  @ApiProperty()
  checkInTime!: Date;
}

export class AnonymousCheckOutResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  spaceNumber!: string;

  @ApiProperty()
  vehiclePlate!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  hours!: number;

  @ApiProperty()
  checkInTime!: string;

  @ApiProperty()
  checkOutTime!: string;

  // ✅ AGREGAR
  @ApiProperty({
    description: 'Datos del estacionamiento',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      address: { type: 'string' },
      phone: { type: 'string', nullable: true },
    },
  })
  parkingLot!: {
    id: string;
    name: string;
    address: string;
    phone?: string;
  }
  rate!:{
    id: string;
    VehicleType: VehicleType;
    pricePerHour: number;
  }
}