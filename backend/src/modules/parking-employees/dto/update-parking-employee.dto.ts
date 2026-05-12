import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-parking-employee.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  position?: string;
}