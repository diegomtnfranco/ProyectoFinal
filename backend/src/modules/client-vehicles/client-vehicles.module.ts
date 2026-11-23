import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { ClientVehicle } from './entities/client-vehicle.entity';
import { ClientVehicleBackfill } from './entities/client-vehicle-backfill.entity';
import { ClientVehiclesService } from './client-vehicles.service';
import { ClientVehiclesController } from './client-vehicles.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientVehicle,
      ClientVehicleBackfill,
      ClientProfile,
    ]),
  ],
  controllers: [ClientVehiclesController],
  providers: [ClientVehiclesService],
  exports: [ClientVehiclesService],
})
export class ClientVehiclesModule {}
