import { IsEmail, IsString, MinLength, IsUUID, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateEmployeeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  @IsUUID()
  parkingLotId!: string;

  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsPhoneNumber()
  @IsOptional()
  phone?: string;
}