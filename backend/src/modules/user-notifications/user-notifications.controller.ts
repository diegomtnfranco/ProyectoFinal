import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserNotificationsService } from './user-notifications.service';
import { ListNotificationsQueryDto } from './dto/user-notifications.dto';

/** Todas las rutas usan el usuario autenticado (JwtAuthGuard global): nunca un userId del cliente */
@ApiTags('user-notifications')
@ApiBearerAuth()
@Controller('user-notifications/me')
export class UserNotificationsController {
  constructor(private readonly service: UserNotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Mis notificaciones (paginadas, más recientes primero)',
  })
  list(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.service.listMine(userId, query.page ?? 1, query.limit ?? 15);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Cantidad de notificaciones no leídas' })
  async unread(@CurrentUser('id') userId: string) {
    return { unreadCount: await this.service.unreadCount(userId) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación propia como leída' })
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(userId, id);
  }
}
