import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { IDEMPOTENCY_HEADER, PageQueryDto, TopUpDto, normalizeIdempotencyKey } from './dto/payments.dto';
import { WalletService } from './wallet.service';

/** Billetera demo: exclusiva del rol CLIENT y siempre del usuario autenticado */
@ApiTags('wallet')
@ApiBearerAuth('JWT-auth')
@Controller('wallet')
@Roles(UserRole.CLIENT)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  @ApiOperation({ summary: 'Saldo y totales de mi billetera demo (se crea la primera vez)' })
  getMine(@CurrentUser('id') userId: string) {
    return this.wallet.getMine(userId);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Historial de movimientos de mi billetera (solo lectura)' })
  listMine(@CurrentUser('id') userId: string, @Query() q: PageQueryDto) {
    return this.wallet.listMine(userId, q.page, q.limit);
  }

  @Post('me/top-ups')
  @ApiOperation({ summary: 'Carga simulada de dinero demo (no usa Mercado Pago)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  topUp(
    @CurrentUser('id') userId: string,
    @Body() dto: TopUpDto,
    @Headers(IDEMPOTENCY_HEADER) idempotencyKey?: string,
  ) {
    return this.wallet.topUp(userId, dto.amountCents, normalizeIdempotencyKey(idempotencyKey));
  }
}
