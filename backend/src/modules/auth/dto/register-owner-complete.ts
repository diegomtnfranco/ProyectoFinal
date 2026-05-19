// src/auth/dto/register-owner-complete.dto.ts
import { 
  IsEmail, IsString, MinLength, IsPhoneNumber, IsOptional, 
  IsLatitude, IsLongitude, IsMilitaryTime, 
  IsNumber, Min, Max, IsBoolean, IsArray, 
  MaxLength
} from 'class-validator';
import { IsCUIT } from '../../parking-owners/common/decorators/is-cuit.decorator'; // Crearemos este decorador
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export class RegisterOwnerCompleteDto {
  // Datos del usuario
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  // Datos del dueño
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  businessName!: string;

  @IsCUIT({ message: 'Debe proporcionar un CUIT válido' })
  @IsOptional()
  cuit?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  // Datos del estacionamiento
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
  @Max(200)
  totalSpaces!: number;

  @IsBoolean()
  @IsOptional()
  allowOnlineReservations?: boolean;

  // Distribución de espacios (opcional, si no se envía se calcula automáticamente)
  @IsOptional()
  spacesDistribution?: {
    car: number;
    truck: number;
    motorcycle: number;
    van?: number;
  };
}