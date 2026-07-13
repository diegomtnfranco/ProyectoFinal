// src/auth/dto/update-profile.dto.ts
import { IsEmail, IsOptional, IsString, MinLength, IsPhoneNumber, IsEnum, IsObject, IsUrl, IsBoolean, IsUUID } from 'class-validator';
import { VehicleTypeEnum } from '../../client-profiles/entities/client-profile.entity';
import { ApiProperty } from '@nestjs/swagger';

// Datos comunes de usuario
class UpdateUserDataDto {
  @ApiProperty({ 
    example: 'nuevo.email@example.com', 
    description: 'Nuevo email del usuario',
    required: false 
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ 
    example: 'NuevaPassword123!', 
    description: 'Nueva contraseña (mínimo 6 caracteres)',
    minLength: 8,
    required: false 
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiProperty({ 
    example: 'https://example.com/avatar.jpg', 
    description: 'URL del avatar',
    required: false 
  })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}

// Datos específicos de cliente
class UpdateClientDataDto {
  @ApiProperty({ 
    example: 'Juan Carlos', 
    description: 'Nuevo nombre del cliente',
    required: false 
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    example: '+5493819999999', 
    description: 'Nuevo teléfono de contacto',
    required: false 
  })
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiProperty({ 
    example: 'XYZ789', 
    description: 'Patente por defecto',
    required: false 
  })
  @IsString()
  @IsOptional()
  defaultVehiclePlate?: string;

  @ApiProperty({ 
    enum: VehicleTypeEnum, 
    example: 'car', 
    description: 'Tipo de vehículo por defecto',
    required: false 
  })
  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  defaultVehicleType?: VehicleTypeEnum;
}

// Datos específicos de dueño de parking
class UpdateOwnerDataDto {
  @ApiProperty({ 
    example: 'Garaje Centro Actualizado SRL', 
    description: 'Nueva razón social',
    required: false 
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({ 
    example: 'Juan Torres', 
    description: 'Nombre del dueño',
    required: false 
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    example: '+5493818888888', 
    description: 'Nuevo teléfono de contacto',
    required: false 
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ 
    example: 'Av. Nueva 456', 
    description: 'Nueva dirección',
    required: false 
  })
  @IsString()
  @IsOptional()
  address?: string;
}

// Datos específicos de empleado de parking
export class UpdateEmployeeDataDto {
  @ApiProperty({ 
    example: 'Carlos Rodríguez', 
    description: 'Nombre del empleado',
    required: false 
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    example: 'EMP-001', 
    description: 'Código del empleado',
    required: false 
  })
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiProperty({ 
    example: 'Supervisor', 
    description: 'Cargo del empleado',
    required: false 
  })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Estado del empleado (activo/inactivo)',
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// DTO principal unificado
export class UpdateProfileDto {
  @ApiProperty({ 
    type: UpdateUserDataDto, 
    description: 'Datos del usuario a actualizar',
    required: false 
  })
  @IsObject()
  @IsOptional()
  user?: UpdateUserDataDto;

  @ApiProperty({ 
    type: UpdateClientDataDto, 
    description: 'Datos del perfil de cliente a actualizar',
    required: false 
  })
  @IsObject()
  @IsOptional()
  client?: UpdateClientDataDto;

  @ApiProperty({ 
    type: UpdateOwnerDataDto, 
    description: 'Datos del perfil de dueño a actualizar',
    required: false 
  })
  @IsObject()
  @IsOptional()
  owner?: UpdateOwnerDataDto;

  @ApiProperty({ 
    type: UpdateEmployeeDataDto, 
    description: 'Datos del perfil de empleado a actualizar',
    required: false 
  })
  @IsObject()
  @IsOptional()
  employee?: UpdateEmployeeDataDto;
}