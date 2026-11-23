import { Body, Controller, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { MercadoPagoService } from './mercadopago.service';

/**
 * Endpoint público para Mercado Pago. No usa JWT: la autenticidad se valida
 * con la firma x-signature y luego se consulta el pago a la API oficial.
 */
@ApiExcludeController()
@Controller('payments/mercadopago')
export class MercadoPagoWebhookController {
  constructor(private readonly mercadoPago: MercadoPagoService) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  handle(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.mercadoPago.handleWebhook({ headers, query, body });
  }
}
