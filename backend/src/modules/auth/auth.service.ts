import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = this.usersService.findByEmail(email);

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

   const { password: _, ...safeUser } = user;

  return {
    access_token: this.jwtService.sign(payload),
     user: safeUser,
};
  }
}