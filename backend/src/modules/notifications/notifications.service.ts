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
    
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verifica tu cuenta - EstacionApp',
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
            <h1>¡Bienvenido a EstacionApp, ${name}!</h1>
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
      subject: '¡Bienvenido a EstacionApp!',
      html: `
        <h1>Bienvenido ${name}</h1>
        <p>Tu cuenta ha sido verificada exitosamente.</p>
        <p>Ya puedes comenzar a usar EstacionApp.</p>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
  const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
  
  await this.mailerService.sendMail({
    to: email,
    subject: 'Recuperación de contraseña - EstacionApp',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Recuperación de contraseña</h1>
          <p>Hola <strong>${name}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <p><a href="${resetUrl}" class="button">Restablecer contraseña</a></p>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p>${resetUrl}</p>
          <div class="warning">
            <p><strong>⚠️ Importante:</strong> Este enlace expirará en <strong>1 hora</strong>.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EstacionApp. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
  
  this.logger.log(`Password reset email sent to ${email}`);
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
    subject: 'Tus credenciales de empleado - EstacionApp',
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

async sendNewReservationNotification(ownerEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: ownerEmail,
    subject: 'Nueva reserva - EstacionApp',
    html: `
      <h1>¡Nueva reserva!</h1>
      <p>Espacio: ${data.spaceNumber}</p>
      <p>Desde: ${new Date(data.startTime).toLocaleString()}</p>
      <p>Hasta: ${new Date(data.endTime).toLocaleString()}</p>
      <p>Patente: ${data.vehiclePlate}</p>
    `,
  });
}

async sendReservationConfirmedNotification(clientEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: clientEmail,
    subject: 'Reserva confirmada - EstacionApp',
    html: `
      <h1>¡Tu reserva ha sido confirmada!</h1>
      <p>Espacio: ${data.spaceNumber}</p>
      <p>Desde: ${new Date(data.startTime).toLocaleString()}</p>
      <p>Hasta: ${new Date(data.endTime).toLocaleString()}</p>
    `,
  });
}

async sendReservationCancelledNotification(clientEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: clientEmail,
    subject: 'Reserva cancelada - EstacionApp',
    html: `
      <h1>Tu reserva ha sido cancelada</h1>
      <p>Espacio: ${data.spaceNumber}</p>
      <p>Motivo: ${data.reason}</p>
    `,
  });
}

async sendReservationExpiredNotification(clientEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: clientEmail,
    subject: 'Reserva expirada - EstacionApp',
    html: `
      <h1>Tu reserva ha expirado</h1>
      <p>Espacio: ${data.spaceNumber}</p>
      <p>La reserva no fue confirmada a tiempo por el estacionamiento.</p>
      <p>Puedes realizar una nueva reserva.</p>
    `,
  });
}

async sendSpaceChangedNotification(clientEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: clientEmail,
    subject: 'Tu espacio ha sido cambiado - EstacionApp',
    html: `
      <h1>Tu espacio de estacionamiento ha sido cambiado</h1>
      <p>Tu reserva ha sido reasignada del espacio <strong>${data.oldSpaceNumber}</strong> al espacio <strong>${data.newSpaceNumber}</strong>.</p>
      <p>Horario: ${new Date(data.startTime).toLocaleString()} - ${new Date(data.endTime).toLocaleString()}</p>
      <p>Disculpa las molestias.</p>
    `,
  });
}

async sendSpaceConflictNotification(ownerEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: ownerEmail,
    subject: '⚠️ Conflicto de espacio - EstacionApp',
    html: `
      <h1>Conflicto de espacio detectado</h1>
      <p>El espacio <strong>${data.spaceNumber}</strong> está ocupado por ${data.occupiedBy} y no se puede asignar a la reserva ${data.reservationId}.</p>
      <p>Horario de reserva: ${new Date(data.startTime).toLocaleString()} - ${new Date(data.endTime).toLocaleString()}</p>
      <p>No hay espacios alternativos disponibles.</p>
      <p>Por favor, toma acción manual.</p>
    `,
  });
}

async sendReservationPendingNotification(clientEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: clientEmail,
    subject: 'Tu reserva está pendiente - EstacionApp',
    html: `
      <h1>Tu reserva está pendiente de confirmación</h1>
      <p>El espacio ${data.spaceNumber} está actualmente ocupado. Tan pronto como quede libre, tu reserva será confirmada.</p>
      <p>Horario solicitado: ${new Date(data.startTime).toLocaleString()}</p>
    `,
  });
}
async sendReservationConfirmedExpiredNotification(clientEmail: string, data: any) {
  await this.mailerService.sendMail({
    to: clientEmail,
    subject: 'Reserva expirada - EstacionApp',
    html: `
      <h1>Tu reserva ha expirado</h1>
      <p>Espacio: ${data.spaceNumber}</p>
      <p>Su reserva fue expirada por el estacionamiento, ya que el vehículo no llegó a tiempo.</p>
      <p>Disculpa las molestias. Realiza una nueva reserva cuando puedas.</p>
    `,
  });
}

}