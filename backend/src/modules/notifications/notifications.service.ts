import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
    
    console.log(this.configService.get('EMAIL_USER'),
            this.configService.get('EMAIL_PASSWORD'))
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verifica tu cuenta - Parking App',
      template: './verification', // Opcional: usar plantilla
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>¡Bienvenido a Parking App, ${name}!</h1>
            <p>Por favor, verifica tu dirección de email haciendo clic en el siguiente botón:</p>
            <p><a href="${verificationUrl}" class="button">Verificar email</a></p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p>${verificationUrl}</p>
            <p>Este enlace expirará en 24 horas.</p>
            <div class="footer">
              <p>Si no solicitaste esta verificación, ignora este mensaje.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    
    this.logger.log(`Verification email sent to ${email}`);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: '¡Bienvenido a Parking App!',
      html: `
        <h1>Bienvenido ${name}</h1>
        <p>Tu cuenta ha sido verificada exitosamente.</p>
        <p>Ya puedes comenzar a usar Parking App.</p>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    
    await this.mailerService.sendMail({
      to: email,
      subject: 'Recuperación de contraseña - Parking App',
      html: `
        <h1>Recuperación de contraseña</h1>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetUrl}">Restablecer contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
      `,
    });
  }

  async sendEmployeeCredentials(
  email: string,
  name: string,
  employeeCode: string,
  pinCode: string,
  parkingLotName: string,
): Promise<void> {
  await this.mailerService.sendMail({
    to: email,
    subject: 'Tus credenciales de empleado - Parking App',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .credentials { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .code { font-size: 24px; font-weight: bold; font-family: monospace; }
          .pin { font-size: 20px; font-weight: bold; font-family: monospace; color: #4CAF50; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>¡Bienvenido a ${parkingLotName}, ${name}!</h1>
          <p>Has sido registrado como empleado en nuestro sistema. Aquí tienes tus credenciales de acceso:</p>
          
          <div class="credentials">
            <p><strong>Código de empleado:</strong></p>
            <p class="code">${employeeCode}</p>
            <p><strong>PIN de acceso:</strong></p>
            <p class="pin">${pinCode}</p>
          </div>
          
          <p><strong>Instrucciones:</strong></p>
          <ol>
            <li>Usa tu código de empleado y PIN para iniciar sesión en la aplicación</li>
            <li>Guarda este PIN en un lugar seguro</li>
            <li>No compartas tus credenciales con nadie</li>
          </ol>
          
          <div class="footer">
            <p>Este es un mensaje automático. Por favor no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

}