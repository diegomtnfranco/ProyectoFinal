import { PartialType } from '@nestjs/mapped-types';
import { CreateParkingOwnerDto } from './create-parking-owner.dto';

export class UpdateParkingOwnerDto extends PartialType(CreateParkingOwnerDto) {}
