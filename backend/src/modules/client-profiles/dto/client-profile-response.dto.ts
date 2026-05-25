import { ApiProperty } from '@nestjs/swagger';
import { VehicleTypeEnum } from '../entities/client-profile.entity';

export class ClientProfileResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del perfil de cliente',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID del usuario asociado',
  })
  userId!: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del cliente',
  })
  name!: string;

  @ApiProperty({
    example: '+54 9 1234-5678',
    description: 'Número de teléfono del cliente',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    example: 'ABC-123-DEF',
    description: 'Placa del vehículo por defecto',
    required: false,
  })
  defaultVehiclePlate?: string;

  @ApiProperty({
    enum: ['car', 'truck', 'motorcycle', 'van'],
    example: 'car',
    description: 'Tipo de vehículo por defecto',
    required: false,
  })
  defaultVehicleType?: VehicleTypeEnum;

  @ApiProperty({
    example: true,
    description: 'Indica si el perfil está activo',
  })
  isActive!: boolean;

  @ApiProperty({
    example: 0,
    description: 'Balance o saldo del cliente',
  })
  balance!: number;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación del perfil',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-20T15:45:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;
}
