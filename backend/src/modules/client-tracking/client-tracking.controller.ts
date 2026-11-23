import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ClientTrackingService } from './client-tracking.service';

/** Solo datos del cliente autenticado: no se aceptan ids de clientes ni de ocupaciones */
@ApiTags('client-tracking')
@ApiBearerAuth()
@Controller('client-tracking/me')
@Roles(UserRole.CLIENT)
export class ClientTrackingController {
  constructor(private readonly service: ClientTrackingService) {}

  @Get()
  @ApiOperation({
    summary:
      'Mis vehículos estacionados (activos) y últimos finalizados, con estimado',
  })
  getMine(@CurrentUser('id') userId: string) {
    return this.service.getMine(userId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Mis avisos (ingreso, cierre, noche, egreso)' })
  getEvents(@CurrentUser('id') userId: string) {
    return this.service.getMyEvents(userId);
  }
}
