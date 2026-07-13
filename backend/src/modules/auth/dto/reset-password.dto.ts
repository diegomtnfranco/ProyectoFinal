import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches, Validate } from 'class-validator';
import { MatchConstraint } from '../validators/match.constraint';

export class ResetPasswordDto {
  @ApiProperty({ example: 'token123456789', description: 'Token de recuperación' })
  @IsString()
  token!: string;

  @ApiProperty({ 
    example: 'NuevaPassword123!', 
    description: 'Nueva contraseña (mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial)',
    minLength: 8,
    maxLength: 50
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede tener más de 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, { 
    message: 'La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial' 
  })
  newPassword!: string;

  @ApiProperty({ 
    example: 'NuevaPassword123!', 
    description: 'Confirmación de la nueva contraseña'
  })
  @IsString()
  @Validate(MatchConstraint, ['newPassword'], { message: 'Las contraseñas no coinciden' })
  confirmPassword!: string;
}