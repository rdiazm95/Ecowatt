import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: Record<string, any>) {
    return this.authService.register(body.email, body.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: Record<string, any>) {
    return this.authService.login(body.email, body.password);
  }

  // --- NUEVO ENDPOINT PROTEGIDO ---
  @UseGuards(AuthGuard('jwt')) // ESTA ES LA CERRADURA
  @Get('perfil')
  getProfile(@Request() req) {
    // Si llegas aquí, es que tu token era válido. 
    // req.user contiene los datos de la función validate() de JwtStrategy
    return {
      mensaje: '¡Has entrado a la zona VIP!',
      usuario: req.user
    };
  }
}