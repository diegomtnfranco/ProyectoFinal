import { PartialType } from '@nestjs/mapped-types';
import { CreateReservationDto } from './create-reservation.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @IsString()
  @IsOptional()
  cancellationReason?: string;
}