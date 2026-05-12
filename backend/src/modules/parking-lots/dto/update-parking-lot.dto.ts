import { PartialType } from '@nestjs/mapped-types';
import { CreateParkingLotDto } from './create-parking-lot.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateParkingLotDto extends PartialType(CreateParkingLotDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}