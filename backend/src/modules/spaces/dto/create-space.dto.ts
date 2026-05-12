import { IsString, IsUUID, IsArray, IsEnum, IsOptional, IsObject, IsNumber, IsBoolean } from 'class-validator';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { SpaceStatus } from '../entities/space.entity';

export class CreateSpaceDto {
  @IsUUID()
  parkingLotId!: string;

  @IsString()
  spaceNumber!: string;

  @IsArray()
  @IsEnum(VehicleType, { each: true })
  allowedVehicleTypes!: VehicleType[];

  @IsEnum(SpaceStatus)
  @IsOptional()
  status?: SpaceStatus;

  @IsObject()
  @IsOptional()
  metadata?: {
    widthMeters?: number;
    lengthMeters?: number;
    hasEvCharger?: boolean;
    isCovered?: boolean;
    floor?: number;
    zone?: string;
  };
}