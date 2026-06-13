import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ParkingOwnersService } from './parking-owners.service';
import { CreateParkingOwnerDto } from './dto/create-parking-owner.dto';
import { UpdateParkingOwnerDto } from './dto/update-parking-owner.dto';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('parking-owners')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN) // Solo administradores pueden gestionar dueños
export class ParkingOwnersController {
  constructor(private readonly parkingOwnersService: ParkingOwnersService) {}

  @Post()
  create(@Body() createParkingOwnerDto: CreateParkingOwnerDto) {
    return this.parkingOwnersService.create(createParkingOwnerDto);
  }

  @Get()
  findAll() {
    return this.parkingOwnersService.findAll();
  }

  @Get('pending')
  getPending() {
    return this.parkingOwnersService.getPendingApproval();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingOwnersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: UpdateParkingOwnerDto) {
    return this.parkingOwnersService.update(id, updateDto);
  }

  @Patch(':id/approve')
approveOwner(
  @Param('id') id: string
) {
  return this.parkingOwnersService.approveOwner(
    id
  )
}

  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingOwnersService.approve(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingOwnersService.remove(id);
  }
}