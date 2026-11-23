import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/** El cliente indica solo el QR y la estadía: patente, importe y dueño los determina el backend */
export class QrCheckoutQueryDto {
  @ApiProperty({ description: 'Token del QR de salida del estacionamiento' })
  @IsString()
  @MaxLength(200)
  token!: string;
}

export class QrCheckoutCashDto extends QrCheckoutQueryDto {
  @ApiProperty({
    description: 'Ocupación identificada por el sistema en la cotización',
  })
  @IsUUID()
  occupancyId!: string;
}

export class QrCheckoutWalletDto extends QrCheckoutCashDto {
  @ApiProperty({
    description:
      'Importe que vio el cliente (centavos). Solo sirve de control: si el importe recalculado ' +
      'por el backend es distinto, no se cobra y se responde AMOUNT_CHANGED con el nuevo importe.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedAmountCents!: number;
}

/** Ingreso por QR de un cliente: solo elige uno de SUS vehículos (patente y tipo los pone el backend) */
export class QrCheckInDto extends QrCheckoutQueryDto {
  @ApiProperty({ description: 'Vehículo registrado en el perfil del cliente' })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Opcional: servicios elegidos',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  serviceKeys?: string[];
}
