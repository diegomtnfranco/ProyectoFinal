import { IsEmail, IsString, MinLength, IsPhoneNumber, IsOptional, IsEnum, Matches, MaxLength, isString } from 'class-validator';
import { VehicleTypeEnum } from '../../client-profiles/entities/client-profile.entity';

export class RegisterClientDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede tener más de 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, { message: 'La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial' })  
  password!: string;

  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede tener más de 80 caracteres' })
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  @IsOptional()
  defaultVehiclePlate?: string;

  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  defaultVehicleType?: VehicleTypeEnum;
}