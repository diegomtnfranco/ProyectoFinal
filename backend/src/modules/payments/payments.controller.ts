import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  IDEMPOTENCY_HEADER,
  PageQueryDto,
  PayObligationDto,
  StaffStatusQueryDto,
  normalizeIdempotencyKey,
} from './dto/payments.dto';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
import { PaymentsService } from './payments.service';
import type { Requester } from './parking-access.service';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  // ------------------------------------------------------------------ cliente

  @Get('config')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Medios de pago disponibles (sin credenciales)' })
  config() {
    return { mercadoPagoEnabled: this.mercadoPago.isEnabled(), sandbox: true, currency: 'ARS' };
  }

  @Get('me')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Historial de pagos de estacionamiento del cliente (no incluye cargas demo)' })
  listMine(@CurrentUser('id') userId: string, @Query() q: PageQueryDto) {
    return this.payments.listMine(userId, q.page, q.limit);
  }

  @Get('me/payable')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Reservas confirmadas y estadías con importe pendiente de pago' })
  listPayable(@CurrentUser('id') userId: string) {
    return this.payments.listPayable(userId);
  }

  @Get('me/:id')
  @Roles(UserRole.CLIENT)
  getMine(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.getMine(userId, id);
  }

  @Post('wallet')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Pagar con saldo EstacionApp (atómico, sin pagos parciales)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  payWithWallet(
    @CurrentUser('id') userId: string,
    @Body() dto: PayObligationDto,
    @Headers(IDEMPOTENCY_HEADER) idempotencyKey?: string,
  ) {
    return this.payments.payWithWallet(userId, dto.obligationType, dto.obligationId, normalizeIdempotencyKey(idempotencyKey));
  }

  @Post('mercadopago')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Iniciar Checkout Pro (Sandbox). Devuelve la URL de redirección' })
  startMercadoPago(@CurrentUser('id') userId: string, @Body() dto: PayObligationDto) {
    return this.mercadoPago.start(userId, dto.obligationType, dto.obligationId);
  }

  @Post(':id/sync')
  @HttpCode(200)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Reconsultar el estado a Mercado Pago (la URL de retorno no confirma pagos)' })
  sync(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.mercadoPago.sync(userId, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Cancelar mi intento de Mercado Pago pendiente' })
  cancel(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.mercadoPago.cancel(userId, id);
  }

  // ------------------------------------------------------------------ dueño / empleado

  @Get('staff/parking-lot/:parkingLotId/status')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({ summary: 'Estado, medio e importe del pago de una estadía o reserva del estacionamiento' })
  staffStatus(
    @CurrentUser() user: Requester,
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Query() q: StaffStatusQueryDto,
  ) {
    return this.payments.staffStatus(user, parkingLotId, q);
  }

  @Post('staff/presential')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({ summary: 'Registrar que el cliente pagó en el estacionamiento (evita el cobro en la app)' })
  registerPresential(@CurrentUser() user: Requester, @Body() dto: PayObligationDto) {
    return this.payments.registerPresential(user, dto.obligationType, dto.obligationId);
  }
}
