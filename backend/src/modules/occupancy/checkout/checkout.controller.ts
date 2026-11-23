import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { RequiresClientVehicle } from '../../client-vehicles/vehicle-required.guard';
import {
  IDEMPOTENCY_HEADER,
  normalizeIdempotencyKey,
} from '../../payments/dto/payments.dto';
import type { Requester } from '../../payments/parking-access.service';
import { CheckoutService } from './checkout.service';
import {
  QrCheckInDto,
  QrCheckoutCashDto,
  QrCheckoutQueryDto,
  QrCheckoutWalletDto,
} from './dto/checkout.dto';

/**
 * Egreso con pago. El cliente nunca envía patente, tipo de vehículo ni importe:
 * el backend identifica el vehículo por las patentes de su perfil y calcula el importe.
 */
@ApiTags('occupancy-checkout')
@ApiBearerAuth()
@Controller('occupancy')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  // ------------------------------------------------------------------ cliente (QR)

  @Get('qr/check-in/vehicles')
  @Roles(UserRole.CLIENT)
  @RequiresClientVehicle()
  @ApiOperation({ summary: 'Mis vehículos para ingresar con el QR de entrada' })
  checkInOptions(
    @CurrentUser('id') userId: string,
    @Query() q: QrCheckoutQueryDto,
  ) {
    return this.checkout.checkInOptions(userId, q.token);
  }

  @Post('qr/check-in')
  @Roles(UserRole.CLIENT)
  @RequiresClientVehicle()
  @ApiOperation({
    summary: 'Ingresar con el QR usando un vehículo de mi perfil',
  })
  checkIn(@CurrentUser('id') userId: string, @Body() dto: QrCheckInDto) {
    return this.checkout.clientQrCheckIn(userId, dto);
  }

  @Get('qr/checkout')
  @Roles(UserRole.CLIENT)
  @RequiresClientVehicle()
  @ApiOperation({
    summary:
      'Identificar mis vehículos estacionados (QR de salida) y cotizar el egreso',
  })
  quote(@CurrentUser('id') userId: string, @Query() q: QrCheckoutQueryDto) {
    return this.checkout.quoteForClient(userId, q.token);
  }

  @Post('qr/checkout/wallet')
  @HttpCode(200)
  @Roles(UserRole.CLIENT)
  @RequiresClientVehicle()
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({
    summary: 'Pagar con la billetera y registrar la salida (operación atómica)',
  })
  payWithWallet(
    @CurrentUser('id') userId: string,
    @Body() dto: QrCheckoutWalletDto,
    @Headers(IDEMPOTENCY_HEADER) idempotencyKey?: string,
  ) {
    return this.checkout.payWithWallet(
      userId,
      dto,
      normalizeIdempotencyKey(idempotencyKey),
    );
  }

  @Post('qr/checkout/cash')
  @Roles(UserRole.CLIENT)
  @RequiresClientVehicle()
  @ApiOperation({
    summary:
      'Solicitar la salida pagando en efectivo (avisa al personal; no libera el espacio)',
  })
  requestCash(
    @CurrentUser('id') userId: string,
    @Body() dto: QrCheckoutCashDto,
  ) {
    return this.checkout.requestCash(userId, dto);
  }

  @Get('checkout-requests/:id')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Estado de mi solicitud de salida' })
  getMyRequest(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checkout.getMyRequest(userId, id);
  }

  @Post('checkout-requests/:id/cancel')
  @HttpCode(200)
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Cancelar mi solicitud de pago en efectivo (solo si sigue pendiente)',
  })
  cancelMyRequest(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checkout.cancelMyRequest(userId, id);
  }

  // ------------------------------------------------------------------ dueño / empleado

  @Get('checkout-quote/:spaceId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({
    summary:
      'Importe actual y solicitud de efectivo antes de confirmar el egreso',
  })
  staffQuote(
    @CurrentUser() user: Requester,
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
  ) {
    return this.checkout.staffQuote(spaceId, user);
  }

  @Get('checkout-requests/active/:parkingLotId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({
    summary: 'Solicitudes de pago en efectivo pendientes del estacionamiento',
  })
  listPending(
    @CurrentUser() user: Requester,
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
  ) {
    return this.checkout.listPendingForLot(parkingLotId, user);
  }
}
