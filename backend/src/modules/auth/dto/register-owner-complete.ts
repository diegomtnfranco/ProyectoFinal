import { 
  IsEmail, IsString, MinLength, IsOptional, 
  IsLatitude, IsLongitude, IsMilitaryTime, 
  IsNumber, Min, Max, IsBoolean, 
  MaxLength, Matches
} from 'class-validator';
import { IsCUIT } from '../../parking-owners/common/decorators/is-cuit.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterOwnerCompleteDto {
  // Datos del usuario
  @ApiProperty({ 
    example: 'owner@estacionamiento.com', 
    description: 'Email del dueño del estacionamiento',
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

  // Datos del dueño
  @ApiProperty({ 
    example: 'Juan Pérez', 
    description: 'Nombre completo del dueño',
    minLength: 3,
    maxLength: 80,
    required: true 
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede tener más de 80 caracteres' })
  name!: string;

  @ApiProperty({ 
    example: 'Garaje Centro SRL', 
    description: 'Razón social o nombre comercial del estacionamiento',
    minLength: 3,
    maxLength: 100,
    required: true 
  })
  @IsString()
  @MinLength(3, { message: 'El nombre comercial debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre comercial no puede tener más de 100 caracteres' })
  businessName!: string;

  @ApiProperty({ 
    example: '30-12345678-9', 
    description: 'CUIT del negocio (formato: XX-XXXXXXXX-X)',
    required: false 
  })
  @IsCUIT({ message: 'Debe proporcionar un CUIT válido (formato: XX-XXXXXXXX-X)' })
  @IsOptional()
  cuit?: string;

  @ApiProperty({ 
    example: '+5493811234567', 
    description: 'Teléfono de contacto',
    required: false 
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ 
    example: 'Av. Central 123, San Miguel de Tucumán', 
    description: 'Dirección del estacionamiento',
    required: false 
  })
  @IsString()
  @IsOptional()
  address?: string;

  // Datos del estacionamiento (primer parking)
  @ApiProperty({ 
    example: 'Garaje Centro - Principal', 
    description: 'Nombre del estacionamiento (opcional, si no se envía usa businessName)',
    required: false 
  })
  @IsString()
  @IsOptional()
  parkingName?: string;

  @ApiProperty({ 
    example: -26.828954, 
    description: 'Latitud de la ubicación del estacionamiento',
    required: true 
  })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ 
    example: -65.204266, 
    description: 'Longitud de la ubicación del estacionamiento',
    required: true 
  })
  @IsLongitude()
  longitude!: number;

  @ApiProperty({ 
    example: '08:00', 
    description: 'Hora de apertura (formato HH:MM)',
    required: true 
  })
  @IsMilitaryTime()
  openTime!: string;

  @ApiProperty({ 
    example: '22:00', 
    description: 'Hora de cierre (formato HH:MM)',
    required: true 
  })
  @IsMilitaryTime()
  closeTime!: string;

  @ApiProperty({ 
    example: 30, 
    description: 'Número total de espacios del estacionamiento (máximo 150)',
    minimum: 1,
    maximum: 150,
    required: true 
  })
  @IsNumber()
  @Min(1)
  @Max(150, { message: 'El número máximo de espacios permitido es 150' })
  totalSpaces!: number;

  @ApiProperty({ 
    example: true, 
    description: 'Permitir reservas online',
    default: true,
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  allowOnlineReservations?: boolean;
}