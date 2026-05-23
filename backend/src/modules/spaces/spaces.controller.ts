import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  create(@Body() createSpaceDto: CreateSpaceDto, @CurrentUser() user: any) {
    return this.spacesService.create(createSpaceDto, user.id, user.role);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.spacesService.findAll();
  }

  @Get('parking-lot/:parkingLotId')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  findByParkingLot(@Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,@CurrentUser() user: any) {
    return this.spacesService.findByParkingLot(parkingLotId);
  }

  @Public()
  @Get('parking-lot/:parkingLotId/available')
  findAvailable(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Query('vehicleType') vehicleType?: VehicleType,
  ) {
    return this.spacesService.findAvailable(parkingLotId, vehicleType);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.spacesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
    @CurrentUser() user: any,
  ) {
    return this.spacesService.update(id, updateSpaceDto, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    return this.spacesService.updateStatus(id, status, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.spacesService.remove(id, user.id, user.role);
  }
}