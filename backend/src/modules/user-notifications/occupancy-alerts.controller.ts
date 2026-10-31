import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { OccupancyAlertsService } from './occupancy-alerts.service';

@ApiTags('occupancy-alerts')
@ApiBearerAuth()
@Controller('occupancy-alerts/me')
@Roles(UserRole.CLIENT)
export class OccupancyAlertsController {
  constructor(private readonly service: OccupancyAlertsService) {}

  @Get()
  @ApiOperation({
    summary: 'Estacionamientos con alerta de lugar libre activa',
  })
  list(@CurrentUser('id') userId: string) {
    return this.service.listMine(userId);
  }

  @Put(':parkingLotId')
  @ApiOperation({ summary: 'Activar alerta (idempotente)' })
  activate(
    @CurrentUser('id') userId: string,
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
  ) {
    return this.service.activate(userId, parkingLotId);
  }

  @Delete(':parkingLotId')
  @ApiOperation({ summary: 'Desactivar alerta' })
  deactivate(
    @CurrentUser('id') userId: string,
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
  ) {
    return this.service.deactivate(userId, parkingLotId);
  }
}
