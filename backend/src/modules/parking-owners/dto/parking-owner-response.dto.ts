import { ApiProperty } from '@nestjs/swagger';

export class ParkingOwnerResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del propietario de estacionamiento',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID del usuario asociado',
  })
  userId!: string;

  @ApiProperty({
    example: 'Estacionamientos ABC S.A.',
    description: 'Nombre del negocio',
  })
  businessName!: string;

  @ApiProperty({
    example: '30-12345678-9',
    description: 'CUIT o número fiscal del negocio',
    required: false,
  })
  cuit?: string;

  @ApiProperty({
    example: '+54 9 1234-5678',
    description: 'Teléfono de contacto',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    example: 'Calle Principal 123, Capital Federal',
    description: 'Dirección registrada',
    required: false,
  })
  address?: string;

  @ApiProperty({
    example: false,
    description: 'Indica si el propietario ha sido aprobado por administrador',
  })
  isApproved!: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica si la cuenta está activa',
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación del registro',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-20T15:45:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;
}

export class ParkingOwnerApprovalResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID del propietario aprobado',
  })
  id!: string;

  @ApiProperty({
    example: 'Estacionamientos ABC S.A.',
    description: 'Nombre del negocio',
  })
  businessName!: string;

  @ApiProperty({
    example: true,
    description: 'Indica que ha sido aprobado',
  })
  isApproved!: boolean;

  @ApiProperty({
    example: '2024-01-20T15:45:00Z',
    description: 'Fecha de aprobación',
  })
  approvedAt!: Date;

  @ApiProperty({
    example: 'Propietario aprobado exitosamente',
    description: 'Mensaje confirmatorio',
  })
  message!: string;
}
