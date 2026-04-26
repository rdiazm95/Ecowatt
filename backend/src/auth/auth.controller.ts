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

  // --- ENDPOINT PROTEGIDO ---
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

  // ==========================================
  // NUEVO: RUTAS DE RECUPERACIÓN DE CONTRASEÑA
  // ==========================================
  
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: Record<string, any>) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: Record<string, any>) {
    // Recibe el email, el código de 6 dígitos y la nueva contraseña elegida
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
  }
}