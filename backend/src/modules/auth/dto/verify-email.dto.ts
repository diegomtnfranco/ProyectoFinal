import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({example: 'token enviado al mail del usuario registrado',
    description: 'Token enviado via email al email registrado. Vencimiento a las 24hs.'})
  @IsString()
  token!: string;
}

