import { ApiProperty } from '@nestjs/swagger';

export class EmployeeParkingLotInfoDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID del estacionamiento',
  })
  id!: string;

  @ApiProperty({
    example: 'Estacionamiento Centro',
    description: 'Nombre del estacionamiento',
  })
  name!: string;

  @ApiProperty({
    example: 'Calle Principal 123',
    description: 'Dirección del estacionamiento',
  })
  address!: string;
}

export class EmployeeResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del empleado',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID del usuario asociado',
  })
  userId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'UUID del estacionamiento donde trabaja',
  })
  parkingLotId!: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre del empleado',
  })
  name!: string;

  @ApiProperty({
    example: 'EMP-2024-001',
    description: 'Código único del empleado',
  })
  employeeCode!: string;

  @ApiProperty({
    example: 'Operario',
    description: 'Cargo o posición del empleado',
    required: false,
  })
  position?: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el empleado está activo',
  })
  isActive!: boolean;

  @ApiProperty({
    type: EmployeeParkingLotInfoDto,
    description: 'Información del estacionamiento donde trabaja',
    required: false,
  })
  parkingLot?: EmployeeParkingLotInfoDto;

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
