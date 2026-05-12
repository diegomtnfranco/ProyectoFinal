// src/modules/clients/dto/create-client.dto.ts
import { IsString, IsUUID, IsOptional, IsEnum, IsPhoneNumber } from 'class-validator';
import { VehicleTypeEnum } from '../entities/client-profile.entity';

export class CreateClientProfileDto {
  @IsUUID()
  userId!: string;

  @IsString()
  name!: string;

  @IsPhoneNumber()
  phone!: string;

  @IsString()
  @IsOptional()
  defaultVehiclePlate?: string;

  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  defaultVehicleType?: VehicleTypeEnum;
}