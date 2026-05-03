import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }


  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }


  // --- ENDPOINT PROTEGIDO ---
  @UseGuards(AuthGuard('jwt')) // ESTA ES LA CERRADURA
  @Get('perfil')
  async getProfile(@Request() req) {
    // Si llegas aquí, es que tu token era válido.
    // Usamos el email del token para buscar todo el perfil completo en la BD
    const usuarioCompleto = await this.authService.getUserProfile(req.user.email);

    return {
      mensaje: '¡Has entrado a la zona VIP!',
      usuario: usuarioCompleto
    };
  }


  // ==========================================
  // NUEVO: RUTAS DE RECUPERACIÓN DE CONTRASEÑA
  // ==========================================

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }


  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    // Recibe el email, el código de 6 dígitos y la nueva contraseña elegida
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
  }
}