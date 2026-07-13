import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { ParkingOwnersModule } from './modules/parking-owners/parking-owners.module';
import { ParkingLotsModule } from './modules/parking-lots/parking-lots.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { RatesModule } from './modules/rates/rates.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { OccupancyModule } from './modules/occupancy/occupancy.module';
import { ClientProfilesModule } from './modules/client-profiles/client-profiles.module';
import { CommonModule } from './modules/common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { appConfig } from './modules/config/app.config';
import { ParkingEmployeesModule } from './modules/parking-employees/parking-employees.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CloudinaryService } from './modules/common/cloudinary/cloudinary.service';
import { SeedModule } from './modules/seed/seed.module';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      load: [appConfig]
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      //synchronize: true,
      //logging:true,
      extra: {
        timezone: 'America/Argentina/Buenos_Aires',
      },
    }),
    AuthModule,
    ParkingLotsModule,
    UsersModule,
    ClientProfilesModule,
    UsersModule,
    ParkingOwnersModule,
    ParkingLotsModule,
    SpacesModule,
    RatesModule,
    ReservationsModule,
    OccupancyModule,
    ClientProfilesModule,
    CommonModule,
    ParkingEmployeesModule,
    NotificationsModule,
    WebsocketModule,
    SeedModule, 

  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,      // ← NUEVO: Registramos guards GLOBALES
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    CloudinaryService,
  ],
})
export class AppModule { }
