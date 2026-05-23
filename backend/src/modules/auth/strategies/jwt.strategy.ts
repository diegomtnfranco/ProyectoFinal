import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

interface JwtPayload {
  sub: string;  // subject -> user id
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      // Extraer JWT del header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Validar el payload del JWT y devolver el usuario
   * Este método se ejecuta automáticamente después de verificar el token
   */
  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['clientProfile', 'parkingOwnerProfile', 'parkingEmployeeProfile'],
    });

    console.log(user);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Devolvemos el usuario para que esté disponible en req.user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      clientProfile: user.clientProfile,
      parkingOwnerProfile: user.parkingOwnerProfile,
      parkingEmployeeProfile: user.parkingEmployeeProfile,
    };
  }
}