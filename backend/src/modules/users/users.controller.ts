import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';  // ← CAMBIADO
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';  // ← CAMBIADO

@Controller('users')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)  // ← Todo el controlador solo para admin
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly cloudinaryService: CloudinaryService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/activate')
  activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id)
  }

  @Patch(':id/deactivate')
  deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id)
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Post('avatar')
  @Roles(UserRole.CLIENT, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)  // ← Permitir a todos los roles autenticados
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Usar memoria para tener acceso al buffer
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
      },
    })
  )
  async uploadAvatar(
    @UploadedFile(new FileValidationPipe({ maxSizeMB: 5 })) file: Express.Multer.File,
    @CurrentUser('id') userId: string
  ) {
    // Subir a Cloudinary con optimización
    const imageUrl = await this.cloudinaryService.uploadImage(file, 'avatars', {
      width: 400,
      height: 400,
      quality: 80,
    });

    // Guardar URL en base de datos
    await this.usersService.updateAvatar(userId, imageUrl);

    return {
      url: imageUrl,
      message: 'Avatar actualizado exitosamente'
    };
  }
}
