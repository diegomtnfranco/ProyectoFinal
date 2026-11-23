import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FinancePaymentsQueryDto, FinanceSeriesQueryDto, FinanceSummaryQueryDto } from '../payments/dto/payments.dto';
import { FinanceService } from './finance.service';

/** Finanzas → Ingresos y pagos. Exclusivo de PARKING_OWNER (empleados y admin no acceden). */
@ApiTags('finance')
@ApiBearerAuth('JWT-auth')
@Controller('finance')
@Roles(UserRole.PARKING_OWNER)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('parking-lots')
  @ApiOperation({ summary: 'Estacionamientos del dueño para el filtro' })
  lots(@CurrentUser('id') userId: string) {
    return this.finance.lots(userId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Ingresos (pagos aprobados) del día, semana, 30 días e histórico + conteos por estado' })
  summary(@CurrentUser('id') userId: string, @Query() q: FinanceSummaryQueryDto) {
    return this.finance.summary(userId, q.parkingLotId);
  }

  @Get('series')
  @ApiOperation({ summary: 'Serie de ingresos por día (30), semana (12) o mes (12)' })
  series(@CurrentUser('id') userId: string, @Query() q: FinanceSeriesQueryDto) {
    return this.finance.series(userId, q.granularity, q.parkingLotId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Pagos recibidos (todos los estados) de mis estacionamientos' })
  payments(@CurrentUser('id') userId: string, @Query() q: FinancePaymentsQueryDto) {
    return this.finance.payments(userId, q);
  }
}
