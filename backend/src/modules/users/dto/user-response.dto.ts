import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID único del usuario',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email del usuario',
  })
  email!: string;

  @ApiProperty({
    enum: ['client', 'parking_owner', 'parking_employee', 'admin'],
    example: 'client',
    description: 'Rol del usuario en el sistema',
  })
  role!: UserRole;

  @ApiProperty({
    example: true,
    description: 'Indica si el email ha sido verificado',
  })
  isVerified!: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica si la cuenta está activa',
  })
  isActive!: boolean;

  @ApiProperty({
    example: 'https://avatar.example.com/user.jpg',
    description: 'URL del avatar del usuario',
    required: false,
  })
  avatarUrl?: string;

  @ApiProperty({
    example: 'user_provider_id_123',
    description: 'ID del proveedor OAuth (Google, etc.)',
    required: false,
  })
  oauthProviderId?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación del usuario',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-20T15:45:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;
}
