import { IsEmail, IsString, MinLength, IsPhoneNumber, IsOptional, IsEnum, Matches, MaxLength, isString } from 'class-validator';
import { VehicleTypeEnum } from '../../client-profiles/entities/client-profile.entity';
import { ApiProperty } from 'node_modules/@nestjs/swagger/dist/decorators/api-property.decorator';

export class RegisterClientDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email!: string;
  @ApiProperty({ example: '123456@Hola', description: 'Contraseña del usuario 8 caracteres, una mayúscula, un número y un carácter especial', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede tener más de 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, { message: 'La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial' })  
  password!: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo del cliente' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El nombre no puede tener más de 80 caracteres' })
  name!: string;

  @ApiProperty({ example: '1234567890', description: 'Número de teléfono del cliente', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'ABC123', description: 'Patente de vehículo por defecto del cliente (opcional)', required: false })
  @IsString()
  @IsOptional()
  defaultVehiclePlate?: string;

  @ApiProperty({ example: 'CAR', description: 'Tipo de vehículo por defecto del cliente (opcional)',required: false, enum: VehicleTypeEnum })
  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  defaultVehicleType?: VehicleTypeEnum;
}