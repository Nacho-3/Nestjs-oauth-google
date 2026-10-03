import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { GoogleProfilePayload } from './types/google-profile.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Lógica del enunciado:
   * 1) Buscar por googleId
   * 2) Si no existe, buscar por email y vincular googleId
   * 3) Si tampoco existe, crear usuario nuevo
   */
  async validateGoogleUser(profile: GoogleProfilePayload): Promise<User> {
    const existingByGoogle = await this.usersService.findByGoogleId(
      profile.googleId,
    );

    if (existingByGoogle) {
      return this.usersService.update(existingByGoogle.id, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        picture: profile.picture,
      });
    }

    const existingByEmail = await this.usersService.findByEmail(profile.email);

    if (existingByEmail) {
      return this.usersService.update(existingByEmail.id, {
        googleId: profile.googleId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        picture: profile.picture,
      });
    }

    return this.usersService.create({
      email: profile.email,
      googleId: profile.googleId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      picture: profile.picture,
    });
  }

  signToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    // Usa JWT_SECRET / expiresIn configurados en AuthModule (JwtModule)
    return this.jwtService.sign(payload);
  }

  loginWithGoogle(user: User) {
    return {
      access_token: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      },
    };
  }
}
