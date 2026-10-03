import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1) Redirige al login de Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport se encarga de la redirección
  }

  // 2) Callback: Google vuelve acá después del consentimiento
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req: { user: User }) {
    // Opción A del enunciado: devolver JWT en JSON (fácil de probar)
    return this.authService.loginWithGoogle(req.user);
  }

  // 3) Ruta privada: solo con Authorization: Bearer <token>
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: { user: User }) {
    const user = req.user;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
    };
  }
}
