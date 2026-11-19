import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsUUID, Max, Min } from 'class-validator';
import { ObligationType, PaymentStatus } from '../payments.constants';
import type { ObligationTypeValue, PaymentStatusValue } from '../payments.constants';

/** El cliente solo indica QUÉ quiere pagar; importe, estacionamiento y dueño los determina el backend */
export class PayObligationDto {
  @ApiProperty({ enum: Object.values(ObligationType) })
  @IsIn(Object.values(ObligationType))
  obligationType!: ObligationTypeValue;

  @ApiProperty({ description: 'Id de la reserva o de la ocupación (estadía)' })
  @IsUUID()
  obligationId!: string;
}

export class TopUpDto {
  @ApiProperty({ description: 'Importe en centavos (entero). Ej: 500000 = $5.000', example: 500000 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountCents!: number;
}

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class StaffStatusQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  occupancyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reservationId?: string;
}

export class FinancePaymentsQueryDto extends PageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parkingLotId?: string;

  @ApiPropertyOptional({ enum: Object.values(PaymentStatus) })
  @IsOptional()
  @IsIn(Object.values(PaymentStatus))
  status?: PaymentStatusValue;
}

export class FinanceSeriesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parkingLotId?: string;

  @ApiProperty({ enum: ['day', 'week', 'month'] })
  @IsIn(['day', 'week', 'month'])
  granularity!: 'day' | 'week' | 'month';
}

export class FinanceSummaryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parkingLotId?: string;
}

/** Header opcional para reintentos seguros */
export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const normalizeIdempotencyKey = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  return /^[A-Za-z0-9_-]{8,80}$/.test(key) ? key : null;
};
