import { PartialType } from '@nestjs/mapped-types';
import { CreateOccupancyDto } from './create-occupancy.dto';

export class UpdateOccupancyDto extends PartialType(CreateOccupancyDto) {}
