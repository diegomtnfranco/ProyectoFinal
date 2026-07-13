import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterUserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del usuario',
  })
  id!: string;

  @ApiProperty({
    example: 'newuser@example.com',
    description: 'Email del usuario registrado',
  })
  email!: string;

  @ApiProperty({
    enum: ['client', 'parking_owner', 'parking_employee', 'admin'],
    example: 'client',
    description: 'Rol del usuario',
  })
  role!: UserRole;

  @ApiProperty({
    example: false,
    description: 'Indica si el email ha sido verificado (falso al registrarse)',
  })
  isVerified!: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica si la cuenta está activa',
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación del usuario',
  })
  createdAt!: Date;
}

export class RegisterResponseDto {
  @ApiProperty({
    type: RegisterUserResponseDto,
    description: 'Información del usuario registrado',
  })
  user!: RegisterUserResponseDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token JWT para autenticación',
  })
  access_token!: string;

  @ApiProperty({
    example: true,
    description: 'Indica si se requiere verificar el email',
  })
  requiresVerification!: boolean;

  @ApiProperty({
    example: false,
    description: 'Indica si requiere aprobación (solo para propietarios)',
    required: false,
  })
  requiresApproval?: boolean;

  @ApiProperty({
    example: 'Se ha enviado un correo de verificación a tu email',
    description: 'Mensaje informativo sobre el registro',
    required: false,
  })
  message?: string;
}
