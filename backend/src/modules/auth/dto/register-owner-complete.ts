// src/auth/dto/register-owner-complete.dto.ts
import { 
  IsEmail, IsString, MinLength, IsOptional, 
  IsLatitude, IsLongitude, IsMilitaryTime, 
  IsNumber, Min, Max, IsBoolean, 
  MaxLength,
  Matches
} from 'class-validator';
import { IsCUIT } from '../../parking-owners/common/decorators/is-cuit.decorator';

export class RegisterOwnerCompleteDto {
  // Datos del usuario
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede tener más de 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, { message: 'La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial' })  
  password!: string;

  // Datos del dueño
  
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede tener más de 80 caracteres' })
  name!: string;

  @IsString()
  @MinLength(3, { message: 'El nombre comercial debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre comercial no puede tener más de 100 caracteres' })
  businessName!: string;

  @IsCUIT({ message: 'Debe proporcionar un CUIT válido (formato: XX-XXXXXXXX-X)' })
  @IsOptional()
  cuit?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  // Datos del estacionamiento (primer parking)
  @IsString()
  @IsOptional()
  parkingName?: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsMilitaryTime()
  openTime!: string;

  @IsMilitaryTime()
  closeTime!: string;

  @IsNumber()
  @Min(1)
  @Max(150,{ message: 'El número máximo de espacios permitido es 150' })
  totalSpaces!: number;

  @IsBoolean()
  @IsOptional()
  allowOnlineReservations?: boolean;
}