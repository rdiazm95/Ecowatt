import { 
  Injectable, 
  UnauthorizedException, 
  BadRequestException, 
  NotFoundException, 
  InternalServerErrorException // <-- Añadido para manejar el error del servidor de correo
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async register(email: string, pass: string) {
    // 1. Comprobar si el usuario ya existe
    const existingUser = await this.usersService.findOneByEmail(email);
    if (existingUser) {
      throw new BadRequestException('El email ya está registrado');
    }

    // 2. Encriptar la contraseña (10 rondas de salt)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pass, saltRounds);

    // 3. Guardar el usuario
    const newUser = await this.usersService.create(email, hashedPassword);

    // 4. Devolver los datos sin la contraseña
    const { passwordHash, ...result } = newUser;
    return result;
  }

  async login(email: string, pass: string) {
    // 1. Buscar al usuario
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 2. Comprobar que la contraseña coincida con el hash
    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 3. Generar el Token JWT
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email }
    };
  }

  // ==========================================
  // NUEVO: OBTENER PERFIL COMPLETO (Para persistir el estado de la UI)
  // ==========================================
  async getUserProfile(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    // Quitamos la contraseña antes de devolver los datos al frontend
    const { passwordHash, ...result } = user;
    return result;
  }

  // ==========================================
  // NUEVO: PASO 1 - SOLICITAR RECUPERACIÓN DE CONTRASEÑA
  // ==========================================
  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Por seguridad no se suele decir "No existe", pero en tu TFG es más útil para el usuario
      throw new NotFoundException('No existe ninguna cuenta con este correo.');
    }

    // 1. Generar código de 6 dígitos aleatorio (ej: 482910)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Establecer fecha de caducidad (15 minutos desde ahora)
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    // 3. Guardar el código y la fecha en la base de datos
    await this.usersService.saveResetToken(user.id, resetCode, expires);

    // 4. Enviar el correo usando la plantilla HTML con manejo de errores
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Recuperación de contraseña - EcoWatt',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2c3e50; text-align: center;">Recuperación de contraseña</h2>
            <p>Hola,</p>
            <p>Has solicitado restablecer tu contraseña en EcoWatt. Usa el siguiente código de 6 dígitos en tu aplicación para crear una nueva contraseña:</p>
            <div style="background-color: #ebf5fb; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #3498db; letter-spacing: 5px; margin: 0;">${resetCode}</h1>
            </div>
            <p style="color: #7f8c8d; font-size: 12px; text-align: center;">Este código caducará en 15 minutos. Si no has solicitado esto, ignora este correo y tu contraseña seguirá siendo la misma.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error al enviar el correo de recuperación:', error);
      throw new InternalServerErrorException('No se pudo conectar con el servidor de correo. Inténtalo de nuevo más tarde.');
    }

    return { message: 'Correo de recuperación enviado con éxito' };
  }

  // ==========================================
  // NUEVO: PASO 2 - VALIDAR Y RESTABLECER CONTRASEÑA
  // ==========================================
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 1. Comprobar que el código existe, coincide y no ha caducado
    const now = new Date();
    if (
      !user.resetPasswordCode || 
      user.resetPasswordCode !== code ||
      !user.resetPasswordExpires ||
      now > user.resetPasswordExpires
    ) {
      throw new BadRequestException('El código es incorrecto o ha caducado.');
    }

    // 2. Encriptar la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 3. Guardar la nueva contraseña y borrar el token para que no se pueda reusar
    await this.usersService.updatePassword(user.id, hashedPassword);

    return { message: 'Contraseña actualizada con éxito' };
  }
}