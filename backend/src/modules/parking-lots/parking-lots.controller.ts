import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe, ParseFloatPipe, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ParkingLotsService } from './parking-lots.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { Public } from 'src/modules/auth/decorators/public.decorator';

@Controller('parking-lots')
@UseGuards(JwtAuthGuard)
export class ParkingLotsController {
  constructor(private readonly parkingLotsService: ParkingLotsService) {}

  @Post()
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  create(@Body() createParkingLotDto: CreateParkingLotDto, @CurrentUser() user: any) {
    return this.parkingLotsService.create(createParkingLotDto, user.id, user.role);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.parkingLotsService.findAll();
  }

  @Public()
  @Get('nearby')
  findNearby(
    @Query('lat', new ParseFloatPipe({ exceptionFactory: () => new BadRequestException('La latitud es requerida y debe ser un número válido') })) lat: number,
    @Query('lng', new ParseFloatPipe({ exceptionFactory: () => new BadRequestException('La longitud es requerida y debe ser un número válido') })) lng: number,
    @Query('radius') radius?: string,
  ) {
    return this.parkingLotsService.findNearby(lat, lng, radius ? parseInt(radius) : 1000);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingLotsService.findOne(id);
  }

  @Get('owner/:ownerId')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  findByOwner(
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @CurrentUser() user: any,
  ) {
    return this.parkingLotsService.findByOwner(ownerId, user.id, user.role);
  }

  @Public()
  @Get(':id/availability')
  getAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingLotsService.getAvailability(id);
  }

  @Patch(':id')
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParkingLotDto: UpdateParkingLotDto,
    @CurrentUser() user: any,
  ) {
    return this.parkingLotsService.update(id, updateParkingLotDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.parkingLotsService.remove(id, user.id, user.role);
  }
}