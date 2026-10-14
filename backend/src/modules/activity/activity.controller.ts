import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ActivityService } from './activity.service';
import { FindActivityQueryDto, RecentActivityQueryDto } from './dto/find-activity.dto';
import { ActivityItemDto, PaginatedActivityDto } from './dto/activity-response.dto';

/**
 * Los guards JwtAuthGuard y RolesGuard ya están registrados globalmente
 * (APP_GUARD en app.module.ts), por eso acá solo se declaran los roles.
 */
@ApiTags('activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /** GET /api/activity/parking-lot/:parkingLotId/recent?limit=3 */
  @Get('parking-lot/:parkingLotId/recent')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Últimas actividades del estacionamiento (ingresos, egresos y reservas)' })
  @ApiResponse({ status: 200, type: [ActivityItemDto] })
  @ApiResponse({ status: 403, description: 'Sin acceso a este estacionamiento' })
  getRecent(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Query() query: RecentActivityQueryDto,
    @CurrentUser() user: any,
  ): Promise<ActivityItemDto[]> {
    return this.activityService.getRecent(parkingLotId, user, query.limit ?? 3);
  }

  /** GET /api/activity/parking-lot/:parkingLotId?page=1&limit=10&type=check_in */
  @Get('parking-lot/:parkingLotId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Historial paginado de actividad del estacionamiento' })
  @ApiResponse({ status: 200, type: PaginatedActivityDto })
  @ApiResponse({ status: 403, description: 'Sin acceso a este estacionamiento' })
  findAll(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Query() query: FindActivityQueryDto,
    @CurrentUser() user: any,
  ): Promise<PaginatedActivityDto> {
    return this.activityService.findPaginated(
      parkingLotId,
      user,
      query.page ?? 1,
      query.limit ?? 10,
      query.type,
    );
  }
}
