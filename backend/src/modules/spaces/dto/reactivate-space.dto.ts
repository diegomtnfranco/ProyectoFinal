import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ReactivateSpaceDto {
  @ApiProperty({
    example: true,
    description: 'Activar o desactivar el espacio',
    default: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}