import { Module } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { OccupancyController } from './occupancy.controller';
import { ActiveOccupancy } from './entities/occupancy.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [OccupancyController],
  providers: [OccupancyService],
  imports: [
      TypeOrmModule.forFeature([ActiveOccupancy])
    ],
})
export class OccupancyModule {}
