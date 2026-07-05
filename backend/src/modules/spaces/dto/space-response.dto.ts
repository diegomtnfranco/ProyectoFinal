import { ApiProperty } from '@nestjs/swagger';
import { SpaceStatus } from '../entities/space.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class SpaceMetadataDto {
  @ApiProperty({
    example: 2,
    description: 'Número de piso donde está ubicado el espacio',
    required: false,
  })
  floor?: number;

  @ApiProperty({
    example: 'A',
    description: 'Zona o sección del estacionamiento',
    required: false,
  })
  zone?: string;

  @ApiProperty({
    example: 2.5,
    description: 'Ancho del espacio en metros',
    required: false,
  })
  widthMeters?: number;

  @ApiProperty({
    example: 5.0,
    description: 'Largo del espacio en metros',
    required: false,
  })
  lengthMeters?: number;

  @ApiProperty({
    example: false,
    description: 'Indica si el espacio tiene cargador de vehículos eléctricos',
    required: false,
  })
  hasEvCharger?: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica si el espacio está cubierto',
    required: false,
  })
  isCovered?: boolean;
}

export class SpaceResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del espacio',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID del estacionamiento al que pertenece',
  })
  parkingLotId!: string;

  @ApiProperty({
    example: 'A-001',
    description: 'Número o identificador del espacio',
  })
  spaceNumber!: string;

  @ApiProperty({
    enum: ['available', 'reserved', 'occupied', 'maintenance'],
    example: 'available',
    description: 'Estado actual del espacio',
  })
  status!: SpaceStatus;

  @ApiProperty({
    example: ['car', 'truck'],
    description: 'Tipos de vehículos permitidos en este espacio',
  })
  allowedVehicleTypes!: VehicleType[];

  @ApiProperty({
    example: false,
    description: 'Indica si el espacio está reservado',
  })
  isReserved!: boolean;

  @ApiProperty({
    example: '2024-01-15T14:30:00Z',
    description: 'Fecha y hora hasta la cual está reservado',
    required: false,
  })
  reservedUntil?: Date | null;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha y hora en que se ocupó el espacio',
    required: false,
  })
  occupiedSince?: Date | null;

  @ApiProperty({
    example: 'ABC-123-DEF',
    description: 'Placa del vehículo que ocupa el espacio',
    required: false,
  })
  occupiedByVehiclePlate?: string | null;

  @ApiProperty({
    example: 'car',
    description: 'Tipo de vehículo que ocupa el espacio',
    required: false,
  })
  occupiedByVehicleType?: VehicleType | null;

  @ApiProperty({
    type: SpaceMetadataDto,
    description: 'Metadatos adicionales del espacio',
    required: false,
  })
  metadata?: SpaceMetadataDto;

  @ApiProperty({
    example: true,
    description: 'Indica si el espacio está activo',
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación del espacio',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-20T15:45:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;

  
}
