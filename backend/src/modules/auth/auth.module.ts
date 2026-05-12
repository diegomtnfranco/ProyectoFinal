// src/auth/auth.module.ts (VERSIÓN CORREGIDA)
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';  // ← Importar ConfigModule y ConfigService
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../users/entities/user.entity';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingEmployee } from 'src/modules/parking-employees/entities/parking-employee.entity';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

@Module({
  imports: [
    PassportModule,
    ConfigModule,  // ← AGREGAR: Esto hace que ConfigService esté disponible
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
    TypeOrmModule.forFeature([User, ClientProfile, ParkingOwner, ParkingEmployee]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, NotificationsService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}