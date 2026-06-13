import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@example.com', description: 'Email del usuario' })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;
}