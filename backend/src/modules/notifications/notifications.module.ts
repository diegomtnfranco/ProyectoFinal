import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';  // ← Importar ConfigModule
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    ConfigModule,  // ← AGREGAR: Esto hace que ConfigService esté disponible
    MailerModule.forRootAsync({
      imports: [ConfigModule],  // ← IMPORTANTE: ConfigModule aquí también
      useFactory: async (configService: ConfigService) => ({
        transport: {
        //   host: configService.get('EMAIL_HOST', 'smtp.gmail.com'),
        //   port: configService.get('EMAIL_PORT', 587),
        service: configService.get('EMAIL_SERVICE', 'gmail'),
          secure: false,
          auth: {
            user: configService.get('EMAIL_USER'),
            pass: configService.get('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"Parking App" <${configService.get('EMAIL_FROM', 'noreply@parkingapp.com')}>`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}