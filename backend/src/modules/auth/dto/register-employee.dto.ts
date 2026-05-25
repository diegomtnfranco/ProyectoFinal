// src/auth/dto/register-employee.dto.ts
import { IsEmail, IsString, MinLength, IsUUID, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterEmployeeDto {
  @ApiProperty({ 
    example: 'empleado@estacionamiento.com', 
    description: 'Email del empleado',
    required: true 
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;

  @ApiProperty({ 
    example: 'Password123!', 
    description: 'Contraseña (mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial)',
    minLength: 8,
    maxLength: 50,
    required: true 
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede tener más de 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, { 
    message: 'La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial' 
  })
  password!: string;

  @ApiProperty({ 
    example: 'Pedro Empleado', 
    description: 'Nombre completo del empleado',
    minLength: 3,
    maxLength: 80,
    required: true 
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede tener más de 80 caracteres' })
  name!: string;

  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'UUID del estacionamiento donde trabajará',
    required: true 
  })
  @IsUUID()
  parkingLotId!: string;

  @ApiProperty({ 
    example: 'EMP-001', 
    description: 'Código único del empleado (generado automáticamente si no se envía)',
    required: false 
  })
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiProperty({ 
    example: 'Cajero', 
    description: 'Puesto del empleado',
    required: false 
  })
  @IsString()
  @IsOptional()
  position?: string;
}