import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ParkingCatalogOption } from './entities/parking-catalog-option.entity';
import { ParkingLotCatalogSelection } from './entities/parking-lot-catalog-selection.entity';
import { ParkingLotCustomService } from './entities/parking-lot-custom-service.entity';
import { ParkingLotProfile } from './entities/parking-lot-profile.entity';
import { ParkingProfilesController } from './parking-profiles.controller';
import { ParkingProfilesService } from './parking-profiles.service';
import { ParkingLotNightPolicy } from './entities/parking-lot-night-policy.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { ParkingLotAccessService } from './parking-lot-access.service';
import { NightPolicyService } from './night-policy.service';
import { NightPolicyController } from './night-policy.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParkingLot,
      ParkingCatalogOption,
      ParkingLotProfile,
      ParkingLotCatalogSelection,
      ParkingLotCustomService,
      ParkingLotNightPolicy,
      ParkingEmployee,
    ]),
  ],
  controllers: [ParkingProfilesController, NightPolicyController],
  providers: [
    ParkingProfilesService,
    ParkingLotAccessService,
    NightPolicyService,
  ],
  exports: [ParkingLotAccessService],
})
export class ParkingProfilesModule {}
