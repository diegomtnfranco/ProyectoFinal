import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards, NotFoundException } from '@nestjs/common';
import { ClientsService } from './client-profiles.service';
import { CreateClientProfileDto } from './dto/create-client-profile.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';

@Controller('client-profiles')
@UseGuards(JwtAuthGuard)
export class ClientProfilesController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN) // Solo admin puede crear perfiles manualmente
  create(@Body() createClientProfileDto: CreateClientProfileDto) {
    return this.clientsService.create(createClientProfileDto);
  }

  @Get()
  @Roles(UserRole.ADMIN) // Solo admin puede listar todos
  findAll() {
    return this.clientsService.findAll();
  }

  @Get('me')
  @Roles(UserRole.CLIENT) // Cliente ve su propio perfil
  async getMyProfile(@CurrentUser('id') userId: string) {
    const profile = await this.clientsService.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Perfil de cliente no encontrado');
    }
    return profile;
  }

  @Get(':id')
  @Roles(UserRole.ADMIN) // Admin puede ver cualquier perfil
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN) // Solo admin puede actualizar perfiles directamente
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateClientProfileDto: UpdateClientProfileDto) {
    return this.clientsService.update(id, updateClientProfileDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.remove(id);
  }
}