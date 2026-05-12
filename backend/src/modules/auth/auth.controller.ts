import { Controller, Post, Body, Get, UseGuards, Req, Res, HttpStatus, HttpCode, ParseUUIDPipe, Patch } from '@nestjs/common';
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
import { UpdateProfileDto } from './dto/update-profile.dto';

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
  @Post('register/client')
  async registerClient(@Body() registerDto: RegisterClientDto) {
    return this.authService.registerClient(registerDto);
  }

  /**
   * Registro de dueño de estacionamiento
   * POST /auth/register/owner
   */
  @Public()
  @Post('register/owner')
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Obtener perfil del usuario autenticado
   * GET /auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
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
  @Post('verify-email')
  async verifyEmail(@Body() verifyDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyDto.token);
  }

  /**
   * Reenviar verificación de email
   * POST /auth/resend-verification
   */
  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  /**
   * Registrar empleado (solo dueño de parking)
   * POST /auth/register/employee
   */
  @Post('register/employee')
  @Roles(UserRole.PARKING_OWNER)
  async registerEmployee(@Body() registerDto: RegisterEmployeeDto, @CurrentUser('id') ownerId: string) {
    return this.authService.registerEmployee(registerDto, ownerId);
  }


@Get('profile')
@UseGuards(JwtAuthGuard)
async getUserProfile(@CurrentUser('id') userId: string) {
  return this.authService.getUserProfile(userId);
}

/**
 * Actualizar mi perfil
 * PATCH /auth/profile
 */
@Patch('profile')
@UseGuards(JwtAuthGuard)
async updateProfile(
  @CurrentUser('id') userId: string,
  @Body() updateDto: UpdateProfileDto,
) {
  return this.authService.updateProfile(userId, updateDto);
}

}
