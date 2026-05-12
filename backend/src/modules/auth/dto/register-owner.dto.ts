import { IsEmail, IsString, MinLength, IsPhoneNumber, IsOptional, min, maxLength, MaxLength, isString } from 'class-validator';
import { IsCUIT } from '../../parking-owners/common/decorators/is-cuit.decorator'; // Crearemos este decorador

export class RegisterOwnerDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString({ message: 'Debe proporcionar un nombre de negocio válido' })
  @MinLength(3, { message: 'El nombre de negocio debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre de negocio no puede tener más de 100 caracteres' })
  businessName!: string;

  @IsCUIT({ message: 'Debe proporcionar un CUIT válido (formato: XX-XXXXXXXX-X)' })
  cuit!: string;

  //@IsPhoneNumber('AR', { message: 'Debe proporcionar un número de teléfono válido' })
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(8, { message: 'La dirección debe tener al menos 8 caracteres' })
  @MaxLength(200, { message: 'La dirección no puede tener más de 200 caracteres' })
  @IsOptional()
  address?: string;
}