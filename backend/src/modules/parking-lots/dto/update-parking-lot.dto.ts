// backend - src/modules/parking-lots/dto/update-parking-lot.dto.ts
import { IsBoolean, IsOptional, IsObject, IsString, IsNumber, IsLatitude, IsLongitude, IsMilitaryTime } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ✅ DTO para settings con todas las propiedades opcionales
export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  allowOnlineReservations?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  cancellationMinutesBefore?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsNumber()
  @IsOptional()
  reservationHoldMinutes?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  blockSpaceHoursBefore?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsNumber()
  @IsOptional()
  maxReservationHours?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsNumber()
  @IsOptional()
  maxAdvanceDays?: number;
}

// ✅ DTO de actualización DEFINIDO EXPLÍCITAMENTE (sin extender)
export class UpdateParkingLotDto {
  @ApiPropertyOptional({ example: 'Estacionamiento Centro' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Av. Corrientes 1234' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: -34.603683 })
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -58.381557 })
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: '08:00' })
  @IsMilitaryTime()
  @IsOptional()
  openTime?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsMilitaryTime()
  @IsOptional()
  closeTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ type: UpdateSettingsDto })
  @IsObject()
  @IsOptional()
  settings?: UpdateSettingsDto;
}