// backend/src/modules/common/services/qr.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class QRService {
  constructor(private configService: ConfigService) {}

  /**
   * Genera token único para QR
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Genera URL para el QR
   */
  getQRUrl(token: string, type: 'check-in' | 'check-out'): string {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    return `${frontendUrl}/scan/${type}?token=${token}`;
  }

  /**
   * Genera imagen QR en base64
   */
  async generateQRImage(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });
  }

  /**
   * Genera un par completo de QR (token + imagen) para un tipo específico
   */
  async generateQRForType(type: 'check-in' | 'check-out'): Promise<{ token: string; qrUrl: string }> {
    const token = this.generateToken();
    const url = this.getQRUrl(token, type);
    const qrImage = await this.generateQRImage(url);
    return { token, qrUrl: qrImage };
  }
}