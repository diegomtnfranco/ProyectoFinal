import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AnonymousCheckOutDto {
  @ApiProperty({ description: 'Token del QR de check-out' })
  @IsString()
  token!: string;
}