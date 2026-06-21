import { Controller, Post, Body, Get, UseGuards, Req, Res, HttpStatus, HttpCode, ParseUUIDPipe, Patch, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { Roles } from './decorators/roles.decorator';
import { UpdateEmployeeDataDto, UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterOwnerCompleteDto } from './dto/register-owner-complete';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * Registro de cliente
   * POST /auth/register/client
   */
  @Public()
  @HttpCode(201)
  @Post('register/client')
  @ApiOperation({ 
    summary: 'Registrar un nuevo cliente',
    description: 'Registra un nuevo cliente con email, contraseña, nombre y datos opcionales como teléfono y vehículo por defecto. Se envía un email de verificación.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Cliente registrado exitosamente',
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de registro inválidos o email ya registrado' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  @ApiBody({ type: RegisterClientDto })
  async registerClient(@Body() registerDto: RegisterClientDto) {
    return this.authService.registerClient(registerDto);
  }

  /**
   * Registro de dueño de estacionamiento
   * POST /auth/register/owner
   */
  @Public()
  @HttpCode(201)
  @Post('register/owner')
  @ApiOperation({ 
    summary: 'Registrar un nuevo dueño de estacionamiento',
    description: 'Registra un nuevo dueño de estacionamiento con email, contraseña, nombre, nombre de negocio y datos opcionales. La cuenta requiere aprobación del administrador.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Dueño de estacionamiento registrado exitosamente, requiere aprobación',
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de registro inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  @ApiBody({ type: RegisterOwnerDto })
  async registerOwner(@Body() registerDto: RegisterOwnerDto) {
    return this.authService.registerOwner(registerDto);
  }

  /**
   * Login de usuario
   * POST /auth/login
   */
  @Public()
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ 
    summary: 'Iniciar sesión',
    description: 'Autentica un usuario con email y contraseña. Retorna el usuario y un token JWT válido por 24 horas.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Inicio de sesión exitoso',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 400, description: 'Email o contraseña ausentes' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    const response =  this.authService.login(loginDto);
    return response
  }

  /**
   * Obtener perfil del usuario autenticado
   * GET /auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Obtiene la información completa del perfil del usuario autenticado, incluyendo datos específicos según su rol'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Perfil obtenido exitosamente',
    type: ProfileResponseDto
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getProfile(@CurrentUser('id', ParseUUIDPipe) userId: string) {
    return this.authService.getProfile(userId);
  }

  /**
   * Iniciar autenticación con Google
   * GET /auth/google
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirige a Google
  }

  /**
   * Callback de Google después de la autenticación
   * GET /auth/google/callback
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const oauthData = {
      googleId: req.user.googleId,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      avatarUrl: req.user.avatarUrl,
    };

    const user = await this.authService.validateOAuthUser(oauthData);
    
    // Generar token JWT manualmente
    const { JwtService } = await import('@nestjs/jwt');
    const jwtService = new JwtService({
      secret: this.configService.get('JWT_SECRET'),
    });
    const token = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    },{
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN')
    });

    // Redirigir al frontend con el token
    const frontendUrl = this.configService.get('FRONTEND_URL');
    res.redirect(`${frontendUrl}/oauth-callback?token=${token}`);
  }

  @Public()
  @HttpCode(200)
  @Post('verify-email')
  @ApiOperation({ 
    summary: 'Verificar dirección de email',
    description: 'Verifica la dirección de email del usuario usando el token enviado por correo'
  })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente' })
  @ApiResponse({ status: 400, description: 'Token de verificación inválido o expirado' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() verifyDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyDto.token);
  }

  /**
 * Registro completo de dueño con creación de estacionamiento
 * POST /auth/register/owner-complete
 */
@Public()
@HttpCode(201)
@Post('register/owner-complete')
@ApiOperation({ 
  summary: 'Registro completo de dueño con creación de estacionamiento',
  description: 'Registra un nuevo dueño de estacionamiento y crea su estacionamiento asociado en un solo paso'
})
@ApiResponse({ 
  status: 201, 
  description: 'Dueño de estacionamiento registrado y estacionamiento creado exitosamente',
  type: RegisterResponseDto
})
@ApiResponse({ status: 400, description: 'Datos de registro inválidos' })
@ApiResponse({ status: 409, description: 'El email ya está registrado' })
@ApiBody({ type: RegisterOwnerCompleteDto })
async registerOwnerComplete(@Body() registerDto: RegisterOwnerCompleteDto) {
  console.log('Received registerOwnerComplete request with data:', registerDto);
  return this.authService.registerOwnerComplete(registerDto);
}

  /**
   * Reenviar verificación de email
   * POST /auth/resend-verification
   */
  @Public()
  @HttpCode(200)
  @Post('resend-verification')
  @ApiOperation({ 
    summary: 'Reenviar verificación de email',
    description: 'Reenvía el email de verificación al usuario si aún no ha verificado su email'
  })
  @ApiResponse({ status: 200, description: 'Email de verificación reenviado exitosamente' })
  @ApiResponse({ status: 400, description: 'Email no válido o usuario no encontrado' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  /**
   * Registrar empleado (solo dueño de parking)
   * POST /auth/register/employee
   */
  @HttpCode(201)
  @Post('register/employee')
  @Roles(UserRole.PARKING_OWNER)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Registrar un nuevo empleado',
    description: 'Registra un nuevo empleado para el estacionamiento del dueño autenticado. Solo los propietarios de estacionamiento pueden crear empleados.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Empleado registrado exitosamente',
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de registro inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo propietarios)' })
  @ApiBody({ type: RegisterEmployeeDto })
  async registerEmployee(@Body() registerDto: RegisterEmployeeDto, @CurrentUser('id') ownerId: string) {
    return this.authService.registerEmployee(registerDto, ownerId);
  }
/**
 * Actualizar mi perfil
 * PATCH /auth/profile
 */
@Patch('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ 
  summary: 'Actualizar mi perfil',
  description: 'Actualiza la información de mi perfil, incluyendo datos personales y datos específicos según mi rol (cliente, propietario, empleado)'
})
@ApiResponse({ 
  status: 200, 
  description: 'Perfil actualizado exitosamente',
  type: ProfileResponseDto
})
@ApiResponse({ status: 400, description: 'Datos de actualización inválidos' })
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 404, description: 'Usuario no encontrado' })
@ApiBody({ type: UpdateProfileDto })
async updateProfile(
  @CurrentUser('id') userId: string,
  @Body() updateDto: UpdateProfileDto,
) {
  return this.authService.updateProfile(userId, updateDto);
}
/**
 * Solicitar recuperación de contraseña
 * POST /auth/forgot-password
 */
@Public()
@HttpCode(200)
@Post('forgot-password')
@ApiOperation({ 
  summary: 'Solicitar recuperación de contraseña',
  description: 'Envía un email con un enlace para restablecer la contraseña'
})
@ApiResponse({ status: 200, description: 'Email enviado exitosamente' })
@ApiResponse({ status: 400, description: 'Email inválido' })
@ApiBody({ type: ForgotPasswordDto })
async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
  return this.authService.forgotPassword(forgotPasswordDto.email);
}

/**
 * Restablecer contraseña
 * POST /auth/reset-password
 */
@Public()
@HttpCode(200)
@Post('reset-password')
@ApiOperation({ 
  summary: 'Restablecer contraseña',
  description: 'Restablece la contraseña usando el token recibido por email'
})
@ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
@ApiResponse({ status: 400, description: 'Token inválido o expirado, o contraseña inválida' })
@ApiBody({ type: ResetPasswordDto })
async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
  return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
}


/**
   * Actualizar empleado (solo dueño)
   * PATCH /auth/employee/:employeeId
   */
  @Patch('employee/:employeeId')
  @Roles(UserRole.PARKING_OWNER)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Actualizar un empleado',
    description: 'Actualiza los datos de un empleado. Solo el propietario del estacionamiento puede hacer esto.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Empleado actualizado exitosamente'
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo propietarios)' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  @ApiBody({ type: UpdateEmployeeDataDto })
  async updateEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser('id') ownerId: string,
    @Body() updateDto: UpdateProfileDto['employee'],
  ) {
    return this.authService.updateEmployeeByOwner(ownerId, employeeId, updateDto);
  }
}
