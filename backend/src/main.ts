import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json,urlencoded } from 'express';

process.env.TZ = 'America/Argentina/Buenos_Aires';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   console.log('🔧 FRONTEND_URL desde env:', process.env.FRONTEND_URL);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  app.enableCors(
    {origin:  process.env.FRONTEND_URL || 'http://localhost:5173',
     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
     credentials: true,
    }
  );
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
  // ============Configuracion SWAGGER http://localhost:3000/api/docs ============
  const config = new DocumentBuilder()
    .setTitle('EstacionApp API')
    .setDescription(`
      API para sistema de mapero y reservas de estacionamientos en tiempo real.
      
      ## Roles disponibles:
      - **client**: Usuario normal que puede reservar lugares de estacionamiento y ver estacionamientos cercanos
      - **parking_owner**: Dueño de estacionamiento que gestiona su negocio
      - **parking_employee**: Empleado que opera el estacionamiento
      - **admin**: Administrador del sistema
      
      ## Autenticación:
      1. Registrarse como cliente o dueño
      2. Login para obtener token JWT
      3. Usar token en header: \`Authorization: Bearer <token>\`
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Autenticación y registro de usuarios')
    .addTag('users', 'Gestión de usuarios (solo admin)')
    .addTag('clients', 'Perfiles de clientes')
    .addTag('parking-owners', 'Gestión de dueños de estacionamientos (solo admin)')
    .addTag('parking-lots', 'Estacionamientos y búsqueda')
    .addTag('spaces', 'Gestión de espacios de estacionamiento')
    .addTag('rates', 'Tarifas por tipo de vehículo')
    .addTag('parking-employees', 'Gestión de empleados')
    .addTag('reservations', 'Reservas de espacios')
    .addTag('occupancy', 'Ocupación y check-in/out')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'EstacionApp API Docs',
  });



  await app.listen(process.env.PORT ?? 3000);

}
bootstrap();
