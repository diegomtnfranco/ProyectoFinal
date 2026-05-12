import { IsString, IsUUID, IsOptional, IsBoolean} from 'class-validator';
import { IsCUIT } from 'src/modules/parking-owners/common/decorators/is-cuit.decorator';

export class CreateParkingOwnerDto {
  @IsUUID()
  userId!: string;

  @IsString()
  businessName!: string;

  @IsCUIT()
  cuit!: string;

  @IsString()
  phone!: string;

  @IsString()
  @IsOptional()
  address?: string;
}