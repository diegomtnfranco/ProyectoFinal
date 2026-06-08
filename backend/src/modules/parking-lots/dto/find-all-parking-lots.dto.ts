// backend/src/modules/parking-lots/dto/find-all-parking-lots.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortByField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FindAllParkingLotsDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;  // ← Valor por defecto directo

  @ApiPropertyOptional({ description: 'Elementos por página', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;  // ← Valor por defecto directo

  @ApiPropertyOptional({ description: 'Término de búsqueda (nombre, dirección, dueño)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: ['all', 'active', 'inactive'], default: 'all' })
  @IsOptional()
  @IsString()
  status: 'all' | 'active' | 'inactive' = 'all';  // ← Valor por defecto directo

  @ApiPropertyOptional({ description: 'Campo por el cual ordenar', enum: SortByField, default: SortByField.CREATED_AT })
  @IsOptional()
  @IsEnum(SortByField)
  sortBy: SortByField = SortByField.CREATED_AT;  // ← Valor por defecto directo

  @ApiPropertyOptional({ description: 'Orden ascendente o descendente', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;  // ← Valor por defecto directo
}