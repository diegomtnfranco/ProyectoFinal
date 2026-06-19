import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { QRService } from './qr/qr.service';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [ConfigModule],
  providers: [CloudinaryService, QRService],
  exports: [CloudinaryService, QRService],
})
export class CommonModule {}
