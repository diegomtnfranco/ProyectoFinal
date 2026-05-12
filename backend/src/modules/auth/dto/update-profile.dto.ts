import { IsEmail, IsOptional, IsString, MinLength, IsPhoneNumber, IsEnum, IsUUID, IsObject } from 'class-validator';
import { VehicleTypeEnum } from '../../client-profiles/entities/client-profile.entity';

// Datos comunes de usuario
class UpdateUserDataDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

// Datos específicos de cliente
class UpdateClientDataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  defaultVehiclePlate?: string;

  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  defaultVehicleType?: VehicleTypeEnum;
}

// Datos específicos de dueño de parking
class UpdateOwnerDataDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

// DTO principal unificado
export class UpdateProfileDto {
  @IsObject()
  @IsOptional()
  user?: UpdateUserDataDto;

  @IsObject()
  @IsOptional()
  client?: UpdateClientDataDto;

  @IsObject()
  @IsOptional()
  owner?: UpdateOwnerDataDto;
}