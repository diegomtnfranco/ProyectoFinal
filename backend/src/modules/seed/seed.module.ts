// backend/src/modules/common/seed/seed.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { User } from '../users/entities/user.entity';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space } from '../spaces/entities/space.entity';
import { Rate } from '../rates/entities/rate.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { QRService } from '../common/qr/qr.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
        ConfigModule,
        CommonModule,  // ← AGREGAR: Esto hace que ConfigService esté disponible
        JwtModule.registerAsync({
          imports: [ConfigModule], 
          inject: [ConfigService], // ← IMPORTANTE: Importar ConfigModule aquí también
          useFactory: async (configService: ConfigService) => ({        
    
            secret: configService.get('JWT_SECRET') || 'super_secret_key_change_me',
            signOptions: {
               
              expiresIn: configService.get('JWT_EXPIRES_IN') ? parseInt(configService.get('JWT_EXPIRES_IN')||'7d', 10) : 86400,
            },
          }),
          
        }),
    TypeOrmModule.forFeature([
      User,
      ClientProfile,
      ParkingOwner,
      ParkingLot,
      Space,
      Rate,
      ParkingEmployee,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService, QRService],
  exports: [SeedService],
})
export class SeedModule {}