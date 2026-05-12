import { IsString, IsUUID, IsNumber, IsOptional, IsObject, IsLatitude, IsLongitude, IsMilitaryTime, IsBoolean, Min, Max } from 'class-validator';

export class CreateParkingLotDto {
  @IsUUID()
  @IsOptional()
  ownerId?: string;  // ← camelCase

  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsMilitaryTime()
  openTime!: string;  // ← camelCase

  @IsMilitaryTime()
  closeTime!: string;  // ← camelCase

  @IsObject()
  @IsOptional()
  settings?: {
    allowOnlineReservations: boolean;  // ← camelCase
    cancellationMinutesBefore: number;
    reservationHoldMinutes: number;
    maxReservationHours?: number;
  };
}