import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class RateResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único de la tarifa',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID del estacionamiento al que pertenece',
  })
  parkingLotId!: string;

  @ApiProperty({
    enum: ['car', 'truck', 'motorcycle', 'van'],
    example: 'car',
    description: 'Tipo de vehículo al que aplica esta tarifa',
  })
  vehicleType!: VehicleType;

  @ApiProperty({
    example: 50.00,
    description: 'Precio por hora en moneda local',
  })
  pricePerHour!: number;

  @ApiProperty({
    enum: ['hourly', 'daily', 'weekly'],
    example: 'hourly',
    description: 'Tipo de tarifa aplicable',
  })
  rateType!: string;

  @ApiProperty({
    example: '08:00',
    description: 'Hora de inicio en la que aplica esta tarifa',
    required: false,
  })
  startTime?: string;

  @ApiProperty({
    example: '22:00',
    description: 'Hora de fin en la que aplica esta tarifa',
    required: false,
  })
  endTime?: string;

  @ApiProperty({
    example: true,
    description: 'Indica si la tarifa está activa',
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación de la tarifa',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-20T15:45:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;
}

export class ApplicableRateResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único de la tarifa aplicable',
  })
  id!: string;

  @ApiProperty({
    example: 50.00,
    description: 'Precio por hora',
  })
  pricePerHour!: number;

  @ApiProperty({
    enum: ['hourly', 'daily', 'weekly'],
    example: 'hourly',
    description: 'Tipo de tarifa',
  })
  rateType!: string;

  @ApiProperty({
    example: '08:00',
    description: 'Hora de inicio',
    required: false,
  })
  startTime?: string;

  @ApiProperty({
    example: '22:00',
    description: 'Hora de fin',
    required: false,
  })
  endTime?: string;
}
