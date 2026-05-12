import { PartialType } from '@nestjs/mapped-types';
import { CreateReservationDto } from './create-reservation.dto';
import { IsEnum, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsDateString()
  @IsOptional()
  cancelledAt?: string;

  @IsUUID()
  @IsOptional()
  appliedRateId?: string;
}