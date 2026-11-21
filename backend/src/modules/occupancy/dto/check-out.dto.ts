import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CheckOutDto {
  @IsUUID()
  spaceId!: string;

  /** Dueño/empleado: el cliente pagó en el lugar. Si se omite, el egreso queda con el pago pendiente */
  @ApiPropertyOptional({
    description: 'El personal recibió el pago presencialmente',
  })
  @IsOptional()
  @IsBoolean()
  paymentReceived?: boolean;
}
