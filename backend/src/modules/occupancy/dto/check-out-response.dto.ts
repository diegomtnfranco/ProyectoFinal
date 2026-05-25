import { ApiProperty } from '@nestjs/swagger';

export class CheckOutResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del registro de ocupación',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID del espacio',
  })
  spaceId!: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha y hora del check-in',
  })
  checkInTime!: Date;

  @ApiProperty({
    example: '2024-01-15T14:30:00Z',
    description: 'Fecha y hora del check-out',
  })
  checkOutTime!: Date;

  @ApiProperty({
    example: 200.00,
    description: 'Monto total a pagar por la ocupación',
  })
  totalAmount!: number;

  @ApiProperty({
    example: 4.0,
    description: 'Duración de la ocupación en horas',
    required: false,
  })
  durationHours?: number;

  @ApiProperty({
    example: true,
    description: 'Indica si la ocupación ha sido completada',
  })
  isCompleted!: boolean;

  @ApiProperty({
    example: '2024-01-15T14:30:00Z',
    description: 'Fecha de actualización del registro',
  })
  updatedAt!: Date;
}
