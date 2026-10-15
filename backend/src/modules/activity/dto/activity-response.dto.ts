import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import type { ActivityType } from './find-activity.dto';

export type EntryMethod = 'manual' | 'qr' | 'reservation';
export type RateChangeActionValue = 'created' | 'updated' | 'deleted';

/** Datos de la tarjeta de cambio de tarifa (solo type === 'rate_change') */
export class RateChangeInfoDto {
  @ApiProperty({ enum: ['created', 'updated', 'deleted'] })
  action!: RateChangeActionValue;

  @ApiPropertyOptional({ nullable: true, description: 'Precio por hora anterior (null en altas)' })
  previousPricePerHour!: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Precio por hora nuevo/actual (null en bajas)' })
  newPricePerHour!: number | null;

  @ApiPropertyOptional({ nullable: true })
  changedByName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  changedByEmail!: string | null;
}
export type ExitMethod = 'manual' | 'qr';

/**
 * Tarjeta de actividad: ingreso, egreso o reserva.
 * Se arma a partir de las tablas existentes (occupancies / reservations),
 * sin escribir nada nuevo en la base.
 */
export class ActivityItemDto {
  @ApiProperty({ description: 'Id único de la tarjeta: <tipo>:<id origen>' })
  id!: string;

  @ApiProperty({ enum: ['check_in', 'check_out', 'reservation', 'rate_change'] })
  type!: ActivityType;

  @ApiProperty({ description: 'Id de la ocupación o reserva de origen' })
  sourceId!: string;

  @ApiProperty({ description: 'Momento de la última acción (ingreso, egreso o creación de la reserva)' })
  occurredAt!: Date;

  @ApiProperty()
  vehiclePlate!: string;

  @ApiProperty({ enum: VehicleType })
  vehicleType!: VehicleType;

  @ApiPropertyOptional()
  spaceNumber?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Horario de ingreso (real para ocupaciones, previsto para reservas)' })
  checkInTime!: Date | null;

  @ApiPropertyOptional({ nullable: true, description: 'Horario de egreso (real para ocupaciones, previsto para reservas)' })
  checkOutTime!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  totalAmount!: number | null;

  @ApiProperty({ description: 'true si el total es una estimación al momento (vehículo aún dentro)' })
  isEstimated!: boolean;

  @ApiProperty({ enum: ['manual', 'qr', 'reservation'] })
  entryMethod!: EntryMethod;

  @ApiPropertyOptional({ enum: ['manual', 'qr'], nullable: true })
  exitMethod!: ExitMethod | null;

  @ApiProperty()
  hasReservation!: boolean;

  @ApiPropertyOptional({ description: 'Estado de la reserva (solo tarjetas de tipo reservation)' })
  reservationStatus?: string;

  @ApiPropertyOptional({ type: RateChangeInfoDto, description: 'Solo tarjetas de tipo rate_change' })
  rateChange?: RateChangeInfoDto;
}

export class PaginatedActivityDto {
  @ApiProperty({ type: [ActivityItemDto] })
  items!: ActivityItemDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  hasMore!: boolean;
}
