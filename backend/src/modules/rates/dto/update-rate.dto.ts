import { PartialType } from '@nestjs/mapped-types';
import { CreateRateDto } from './create-rate.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRateDto extends PartialType(CreateRateDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}