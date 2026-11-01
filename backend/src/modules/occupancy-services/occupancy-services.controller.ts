import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import type { AccessRequester } from '../parking-profiles/parking-lot-access.service';
import { OccupancyServicesService } from './occupancy-services.service';
import {
  UpdateOccupancyServicesDto,
  UpdateServiceStatusDto,
} from './dto/occupancy-services.dto';

/**
 * Guards globales (JwtAuthGuard + RolesGuard). La pertenencia al
 * estacionamiento se valida en el servicio.
 */
@ApiTags('occupancy-services')
@Controller()
export class OccupancyServicesController {
  constructor(private readonly service: OccupancyServicesService) {}

  @Public()
  @Get('occupancy/anonymous/services')
  @ApiQuery({ name: 'token', required: true })
  @ApiOperation({
    summary:
      'Servicios disponibles para el ingreso por QR (valida el token de check-in)',
  })
  listForQr(@Query('token') token: string) {
    return this.service.listForQrToken(token);
  }

  @Get('parking-profiles/:parkingLotId/selectable-services')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({
    summary: 'Servicios activos para el formulario de ingreso manual',
  })
  listForStaff(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: AccessRequester,
  ) {
    return this.service.listForStaff(parkingLotId, user);
  }

  @Get('occupancy/space/:spaceId/services')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({ summary: 'Servicios de la ocupación activa de un espacio' })
  getForSpace(
    @Param('spaceId', ParseUUIDPipe) spaceId: string,
    @CurrentUser() user: AccessRequester,
  ) {
    return this.service.getForSpace(spaceId, user);
  }

  @Put('occupancy/:occupancyId/services')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({
    summary: 'Reemplazar los servicios solicitados de una ocupación activa',
  })
  update(
    @Param('occupancyId', ParseUUIDPipe) occupancyId: string,
    @Body() dto: UpdateOccupancyServicesDto,
    @CurrentUser() user: AccessRequester,
  ) {
    return this.service.updateForOccupancy(occupancyId, dto.serviceKeys, user);
  }

  @Patch('occupancy/:occupancyId/services/:serviceKey/status')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiOperation({
    summary: 'Marcar un servicio seleccionado como realizado / no realizado',
  })
  setStatus(
    @Param('occupancyId', ParseUUIDPipe) occupancyId: string,
    @Param('serviceKey') serviceKey: string,
    @Body() dto: UpdateServiceStatusDto,
    @CurrentUser() user: AccessRequester,
  ) {
    return this.service.setServiceStatus(
      occupancyId,
      serviceKey,
      dto.status,
      user,
    );
  }
}
