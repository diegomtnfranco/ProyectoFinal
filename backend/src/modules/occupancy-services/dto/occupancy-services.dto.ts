import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  Matches,
} from 'class-validator';
import type { PricingView } from '../../parking-profiles/dto/parking-profile-response.dto';

/** 'catalog:<code>' o 'custom:<uuid>' */
export const SERVICE_KEY_REGEX =
  /^(catalog:[a-z0-9_]{1,50}|custom:[0-9a-f-]{36})$/;

export class UpdateServiceStatusDto {
  @ApiProperty({ enum: ['selected', 'performed', 'not_performed'] })
  @IsIn(['selected', 'performed', 'not_performed'], {
    message: 'Estado inválido',
  })
  status!: 'selected' | 'performed' | 'not_performed';
}

export class UpdateOccupancyServicesDto {
  @ApiProperty({ type: [String], example: ['catalog:car_wash'] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Matches(SERVICE_KEY_REGEX, {
    each: true,
    message: 'Identificador de servicio inválido',
  })
  serviceKeys!: string[];
}

export interface OfferedServiceView {
  key: string;
  source: 'catalog' | 'custom';
  name: string;
  description: string | null;
  conditions: string | null;
  pricing: PricingView;
}

export interface SelectedServiceView {
  key: string;
  name: string;
  pricing: PricingView | null;
  selectedVia: string;
  selectedAt: Date;
  /** true si el dueño lo desactivó después de seleccionarlo: se conserva lo acordado */
  noLongerOffered: boolean;
  /** selected | performed | not_performed */
  status: string;
}

export interface OccupancyServicesView {
  occupancyId: string;
  spaceId: string;
  spaceNumber: string | null;
  vehiclePlate: string | null;
  offered: OfferedServiceView[];
  selected: SelectedServiceView[];
}

export interface CheckInServicesResult {
  selected: { key: string; name: string; pricing: PricingView | null }[];
  ignoredServiceKeys: string[];
}
