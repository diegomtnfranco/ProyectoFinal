import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'usuario@example.com', description: 'Email del usuario' ,required: true})
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;

  @ApiProperty({ example: '123456@Hola', description: 'Contraseña del usuario 8 caracteres, una mayúscula, un número y un carácter especial', minLength: 8 ,required: true })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}