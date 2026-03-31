import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
}