import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { User, UserRole } from 'src/modules/users/entities/user.entity';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) { }

  @Post()
  @Roles(UserRole.CLIENT)
  create(@Body() createReservationDto: CreateReservationDto, @CurrentUser('id') userId: string) {
    // Pasar el userId al servicio para asociar la reserva al cliente autenticado
    return this.reservationsService.create(createReservationDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)  // Solo admin puede ver todas las reservas
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    // Cliente solo puede ver sus reservas, admin/dueño/empleado pueden ver cualquier
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)  // Solo admin o dueño pueden editar
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentUser() user: User
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)  // Solo admin puede eliminar permanentemente
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.remove(id);
  }

  @Get('parking-lot/:parkingLotId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  findByParkingLot(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: User
  ) {
    return this.reservationsService.findByParkingLot(parkingLotId, user.id, user.role);
  }

  @Post(':id/cancel')
  @Roles(UserRole.CLIENT)
  cancelByClient(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.reservationsService.cancelByClient(id, userId);
  }

  @Post(':id/cancel-by-parking')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  cancelByParking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any
  ) {
    return this.reservationsService.cancelByParking(id, user.id, user.role);
  }
}