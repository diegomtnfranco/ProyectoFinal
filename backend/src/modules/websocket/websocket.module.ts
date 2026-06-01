import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebsocketGateway } from './websocket.gateway';
import { User } from '../users/entities/user.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space } from '../spaces/entities/space.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),  // ← También puedes usar forRoot() para asegurar
    TypeOrmModule.forFeature([User, ParkingLot, Space]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}