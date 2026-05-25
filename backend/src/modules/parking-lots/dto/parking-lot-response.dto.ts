import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { SpaceStatus } from '../../spaces/entities/space.entity';

export class ParkingLotStatsDto {
  @ApiProperty({
    example: 50,
    description: 'Total de espacios en el estacionamiento',
  })
  totalSpaces!: number;

  @ApiProperty({
    example: 20,
    description: 'Espacios disponibles para reservar',
  })
  availableSpaces!: number;

  @ApiProperty({
    example: 15,
    description: 'Espacios actualmente ocupados',
  })
  occupiedSpaces!: number;

  @ApiProperty({
    example: 10,
    description: 'Espacios reservados',
  })
  reservedSpaces!: number;

  @ApiProperty({
    example: 5,
    description: 'Espacios en mantenimiento',
  })
  maintenanceSpaces!: number;
}

export class SpaceDetailResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del espacio',
  })
  id!: string;

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
    example: {
      floor: 2,
      zone: 'A',
      widthMeters: 2.5,
      lengthMeters: 5.0,
      hasEvCharger: false,
      isCovered: true,
    },
    description: 'Metadatos adicionales del espacio',
    required: false,
  })
  metadata?: {
    floor?: number;
    zone?: string;
    widthMeters?: number;
    lengthMeters?: number;
    hasEvCharger?: boolean;
    isCovered?: boolean;
  };
}

export class RateDetailDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único de la tarifa',
  })
  id!: string;

  @ApiProperty({
    example: 'car',
    description: 'Tipo de vehículo al que aplica',
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
    description: 'Tipo de tarifa',
  })
  rateType!: string;

  @ApiProperty({
    example: '08:00',
    description: 'Hora de inicio de aplicación de la tarifa',
    required: false,
  })
  startTime?: string;

  @ApiProperty({
    example: '22:00',
    description: 'Hora de fin de aplicación de la tarifa',
    required: false,
  })
  endTime?: string;

  @ApiProperty({
    example: true,
    description: 'Indica si la tarifa está activa',
  })
  isActive!: boolean;
}

export class ParkingLotResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del estacionamiento',
  })
  id!: string;

  @ApiProperty({
    example: 'Estacionamiento Centro',
    description: 'Nombre del estacionamiento',
  })
  name!: string;

  @ApiProperty({
    example: 'Calle Principal 123, Capital Federal',
    description: 'Dirección completa del estacionamiento',
  })
  address!: string;

  @ApiProperty({
    example: -34.603683,
    description: 'Latitud de ubicación del estacionamiento',
  })
  latitude!: number;

  @ApiProperty({
    example: -58.381557,
    description: 'Longitud de ubicación del estacionamiento',
  })
  longitude!: number;

  @ApiProperty({
    example: '06:00',
    description: 'Hora de apertura del estacionamiento',
  })
  openTime!: string;

  @ApiProperty({
    example: '23:00',
    description: 'Hora de cierre del estacionamiento',
  })
  closeTime!: string;

  @ApiProperty({
    example: {
      allowOnlineReservations: true,
      cancellationMinutesBefore: 30,
      reservationHoldMinutes: 15,
    },
    description: 'Configuración del estacionamiento',
  })
  settings!: {
    allowOnlineReservations: boolean;
    cancellationMinutesBefore: number;
    reservationHoldMinutes: number;
  };

  @ApiProperty({
    example: true,
    description: 'Indica si el estacionamiento está activo',
  })
  isActive!: boolean;

  @ApiProperty({
    type: ParkingLotStatsDto,
    description: 'Estadísticas de disponibilidad del estacionamiento',
    required: false,
  })
  stats?: ParkingLotStatsDto;

  @ApiProperty({
    type: [SpaceDetailResponseDto],
    description: 'Lista de espacios del estacionamiento',
    required: false,
  })
  spaces?: SpaceDetailResponseDto[];

  @ApiProperty({
    type: [RateDetailDto],
    description: 'Lista de tarifas del estacionamiento',
    required: false,
  })
  rates?: RateDetailDto[];

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación del estacionamiento',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-20T15:45:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;
}

export class ParkingLotAvailabilityResponseDto {
  @ApiProperty({
    example: 50,
    description: 'Total de espacios',
  })
  totalSpaces!: number;

  @ApiProperty({
    example: 20,
    description: 'Espacios disponibles',
  })
  availableSpaces!: number;

  @ApiProperty({
    example: 15,
    description: 'Espacios ocupados',
  })
  occupiedSpaces!: number;

  @ApiProperty({
    example: 10,
    description: 'Espacios reservados',
  })
  reservedSpaces!: number;

  @ApiProperty({
    example: 5,
    description: 'Espacios en mantenimiento',
  })
  maintenanceSpaces!: number;

  @ApiProperty({
    example: 0.4,
    description: 'Porcentaje de disponibilidad (0-1)',
  })
  percentageAvailable!: number;
}

export class ParkingLotNearbyResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del estacionamiento',
  })
  id!: string;

  @ApiProperty({
    example: 'Estacionamiento Centro',
    description: 'Nombre del estacionamiento',
  })
  name!: string;

  @ApiProperty({
    example: 'Calle Principal 123, Capital Federal',
    description: 'Dirección del estacionamiento',
  })
  address!: string;

  @ApiProperty({
    example: -34.603683,
    description: 'Latitud',
  })
  latitude!: number;

  @ApiProperty({
    example: -58.381557,
    description: 'Longitud',
  })
  longitude!: number;

  @ApiProperty({
    example: 250,
    description: 'Distancia aproximada en metros desde el punto de búsqueda',
  })
  distance!: number;

  @ApiProperty({
    type: ParkingLotStatsDto,
    description: 'Estadísticas de disponibilidad',
  })
  stats!: ParkingLotStatsDto;

  @ApiProperty({
    example: '06:00',
    description: 'Hora de apertura',
  })
  openTime!: string;

  @ApiProperty({
    example: '23:00',
    description: 'Hora de cierre',
  })
  closeTime!: string;
}
