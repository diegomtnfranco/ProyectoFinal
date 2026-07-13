import { Module } from '@nestjs/common';
import { ClientsService } from './client-profiles.service';
import { ClientProfilesController } from './client-profiles.controller';
import { ClientProfile } from './entities/client-profile.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';

@Module({
  controllers: [ClientProfilesController],
  providers: [ClientsService],
  exports: [ClientsService],
  imports: [
      TypeOrmModule.forFeature([ClientProfile,User])
    ],
})
export class ClientProfilesModule {}
