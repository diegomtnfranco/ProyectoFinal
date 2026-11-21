import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseGuards, Optional, GoneException, Headers, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OccupancyService } from './occupancy.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AnonymousCheckOutDto } from './dto/anonymous-check-out.dto';
import { AnonymousCheckInDto } from './dto/anonymous-check-in.dto';
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutErrorCode } from './checkout/checkout.constants';

@ApiTags('occupancy')
@ApiBearerAuth()
@Controller('occupancy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OccupancyController {
  constructor(
    private readonly occupancyService: OccupancyService,
    // Opcional para no romper las pruebas unitarias que construyen el controlador solo con el servicio
    @Optional() private readonly checkout?: CheckoutService,
  ) {}

  /**
   * Registrar check-in (ocupar espacio)
   * POST /occupancy/check-in
   */
  @Post('check-in')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar check-in' ,description: 'Registra el check-in de un vehículo en un espacio específico' })
  @ApiResponse({ status: 201, description: 'Check-in registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de check-in inválidos' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CheckInDto })
  async checkIn(
    @Body() checkInDto: CheckInDto,
    @CurrentUser() user: any,
  ) {
    // Dueño/empleado solo en sus estacionamientos (ADMIN sin cambios)
    await this.checkout?.assertSpaceAccess(checkInDto.spaceId, user);
    return this.occupancyService.checkIn(checkInDto, user.id, user.role);
  }

  /**
   * Registrar check-out (liberar espacio)
   * POST /occupancy/check-out
   */
  @Post('check-out')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar check-out' ,description: 'Registra el check-out de un vehículo de un espacio específico' })
  @ApiResponse({ status: 200, description: 'Check-out registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de check-out inválidos' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CheckOutDto })
  async checkOut(
    @Body() checkOutDto: CheckOutDto,
    @CurrentUser() user: any,
  ) {
    // Valida pertenencia al estacionamiento y, con `paymentReceived`, registra el cobro presencial
    if (this.checkout) return this.checkout.staffCheckOut(checkOutDto, user);
    return this.occupancyService.checkOut(checkOutDto, user.id, user.role);
  }

  /**
   * Ver ocupaciones activas de un estacionamiento
   * GET /occupancy/active/:parkingLotId
   */
  @Get('active/:parkingLotId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver ocupaciones activas' ,description: 'Obtiene las ocupaciones activas de un estacionamiento específico' })
  @ApiResponse({ status: 200, description: 'Ocupaciones activas obtenidas exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async getActiveOccupancies(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: any,
  ) {
    await this.checkout?.assertLotAccess(parkingLotId, user);
    return this.occupancyService.getActiveOccupancies(parkingLotId, user.id, user.role);
  }

  /**
   * Ver historial de ocupaciones de un espacio
   * GET /occupancy/history/:spaceId
   */
  @Get('history/:spaceId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver historial de ocupaciones' ,description: 'Obtiene el historial de ocupaciones de un espacio específico' })
  @ApiResponse({ status: 200, description: 'Historial de ocupaciones obtenido exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CheckInDto })
  async getSpaceHistory(@Param('spaceId', ParseUUIDPipe) spaceId: string, @CurrentUser() user?: any) {
    if (user) await this.checkout?.assertSpaceAccess(spaceId, user);
    return this.occupancyService.getSpaceHistory(spaceId);
  }


  @Public()
  @Post('anonymous/check-in')
  @ApiOperation({ summary: 'Check-in anónimo usando QR' })
  @ApiResponse({ status: 201, description: 'Check-in registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sin espacios' })
  @ApiResponse({ status: 404, description: 'QR inválido' })
  async anonymousCheckIn(@Body() checkInDto: AnonymousCheckInDto, @Headers('authorization') authorization?: string) {
    // Un cliente con sesión ingresa eligiendo uno de sus vehículos (POST /occupancy/qr/check-in):
    // no puede escribir una patente ni elegir el tipo a mano
    if (isClientToken(authorization)) {
      throw new ForbiddenException({
        code: CheckoutErrorCode.QR_USE_REGISTERED_VEHICLE,
        message: 'Con tu cuenta, elegí uno de tus vehículos registrados para ingresar.',
      });
    }
    return this.occupancyService.anonymousCheckIn(checkInDto);
  }

  /**
   * D1 (checkout QR con pagos): la salida por QR exige sesión de cliente y se
   * hace con GET /occupancy/qr/checkout + POST /occupancy/qr/checkout/{wallet|cash}.
   * Se mantiene la ruta para devolver un mensaje claro a clientes viejos en lugar de un 404.
   */
  @Public()
  @Post('anonymous/check-out')
  @ApiOperation({ summary: 'Deshabilitado: la salida por QR requiere iniciar sesión' })
  @ApiResponse({ status: 410, description: 'La salida por QR requiere iniciar sesión como cliente' })
  async anonymousCheckOut(@Body() _checkOutDto: AnonymousCheckOutDto): Promise<never> {
    throw new GoneException({
      code: CheckoutErrorCode.QR_LOGIN_REQUIRED,
      message: 'Para salir con el QR iniciá sesión en EstacionApp, o acercate al personal del estacionamiento.',
    });
  }
}

/** La ruta es pública: el token, si viene, se verifica acá solo para saber si es un cliente */
function isClientToken(authorization?: string): boolean {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    const payload = new JwtService({ secret: process.env.JWT_SECRET }).verify<{ role?: string }>(token);
    return payload?.role === UserRole.CLIENT;
  } catch {
    return false; // token vencido o inválido: se trata como ingreso sin cuenta
  }
}
