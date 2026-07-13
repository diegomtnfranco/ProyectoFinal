import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class CheckInResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del registro de ocupación',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID del espacio ocupado',
  })
  spaceId!: string;

  @ApiProperty({
    example: 'ABC-123-DEF',
    description: 'Placa del vehículo que realiza el check-in',
  })
  vehiclePlate!: string;

  @ApiProperty({
    enum: ['car', 'truck', 'motorcycle', 'van'],
    example: 'car',
    description: 'Tipo de vehículo',
  })
  vehicleType!: VehicleType;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha y hora del check-in',
  })
  checkInTime!: Date;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'UUID del empleado que registró el check-in',
  })
  checkedInBy!: string;

  @ApiProperty({
    example: false,
    description: 'Indica si la ocupación ha sido completada (check-out realizado)',
  })
  isCompleted!: boolean;

  @ApiProperty({
    example: null,
    description: 'Información de la reserva asociada (si existe)',
    required: false,
  })
  reservationId?: string | null;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación del registro',
  })
  createdAt!: Date;
}
