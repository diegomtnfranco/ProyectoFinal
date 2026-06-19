import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { OccupancyService } from './occupancy.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AnonymousCheckOutDto } from './dto/anonymous-check-out.dto';
import { AnonymousCheckInDto } from './dto/anonymous-check-in.dto';

@ApiTags('occupancy')
@ApiBearerAuth()
@Controller('occupancy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OccupancyController {
  constructor(private readonly occupancyService: OccupancyService) {}

  /**
   * Registrar check-in (ocupar espacio)
   * POST /occupancy/check-in
   */
  @Post('check-in')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar check-in' ,description: 'Registra el check-in de un vehículo en un espacio específico' })
  @ApiResponse({ status: 201, description: 'Check-in registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de check-in inválidos' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CheckInDto })
  async checkIn(
    @Body() checkInDto: CheckInDto,
    @CurrentUser() user: any,
  ) {
    console.log('Check-in DTO:', checkInDto);
    return this.occupancyService.checkIn(checkInDto, user.id, user.role);
  }

  /**
   * Registrar check-out (liberar espacio)
   * POST /occupancy/check-out
   */
  @Post('check-out')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar check-out' ,description: 'Registra el check-out de un vehículo de un espacio específico' })
  @ApiResponse({ status: 200, description: 'Check-out registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de check-out inválidos' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CheckOutDto })
  async checkOut(
    @Body() checkOutDto: CheckOutDto,
    @CurrentUser() user: any,
  ) {
    

    const response =  this.occupancyService.checkOut(checkOutDto, user.id, user.role);
    
    return response
  }

  /**
   * Ver ocupaciones activas de un estacionamiento
   * GET /occupancy/active/:parkingLotId
   */
  @Get('active/:parkingLotId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver ocupaciones activas' ,description: 'Obtiene las ocupaciones activas de un estacionamiento específico' })
  @ApiResponse({ status: 200, description: 'Ocupaciones activas obtenidas exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async getActiveOccupancies(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: any,
  ) {
    return this.occupancyService.getActiveOccupancies(parkingLotId, user.id, user.role);
  }

  /**
   * Ver historial de ocupaciones de un espacio
   * GET /occupancy/history/:spaceId
   */
  @Get('history/:spaceId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver historial de ocupaciones' ,description: 'Obtiene el historial de ocupaciones de un espacio específico' })
  @ApiResponse({ status: 200, description: 'Historial de ocupaciones obtenido exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CheckInDto })
  async getSpaceHistory(@Param('spaceId', ParseUUIDPipe) spaceId: string) {
    return this.occupancyService.getSpaceHistory(spaceId);
  }


  @Public()
  @Post('anonymous/check-in')
  @ApiOperation({ summary: 'Check-in anónimo usando QR' })
  @ApiResponse({ status: 201, description: 'Check-in registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sin espacios' })
  @ApiResponse({ status: 404, description: 'QR inválido' })
  async anonymousCheckIn(@Body() checkInDto: AnonymousCheckInDto) {
    return this.occupancyService.anonymousCheckIn(checkInDto);
  }

  @Public()
  @Post('anonymous/check-out')
  @ApiOperation({ summary: 'Check-out anónimo usando QR' })
  @ApiResponse({ status: 200, description: 'Check-out registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'No hay ocupación activa' })
  async anonymousCheckOut(@Body() checkOutDto: AnonymousCheckOutDto) {
    return this.occupancyService.anonymousCheckOut(checkOutDto);
  }
}