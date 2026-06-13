import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class ParkingLotNearbyResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Garaje Centro' })
  name!: string;

  @ApiProperty({ example: 'Av. Central 500' })
  address!: string;

  @ApiProperty({ example: -26.828954 })
  latitude!: number;

  @ApiProperty({ example: -65.204266 })
  longitude!: number;

  @ApiProperty({ example: 1200 })
  distance!: number;  // ← Distancia en metros

  @ApiProperty({ example: '08:00' })
  openTime!: string;

  @ApiProperty({ example: '22:00' })
  closeTime!: string;

  @ApiProperty({ 
    description: 'Disponibilidad en tiempo real',
    example: { total: 50, available: 15, occupied: 30, reserved: 5 }
  })
  availability!: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  };
  rates!: {
    id: string;
    vehicleType: VehicleType;
    price: number;
  }[];
  @ApiProperty({ example: 'https://example.com/images/garaje-centro.jpg', nullable: true })
  imageUrl?: string;
}