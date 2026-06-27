import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AnonymousCheckOutDto {
  @ApiProperty({ description: 'Token del QR de check-out' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'ABC123', description: 'Patente del vehículo' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, { message: 'La patente solo puede contener letras mayúsculas y números' })
  vehiclePlate!: string;
}