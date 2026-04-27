import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const newUser = this.usersRepository.create({
      email,
      passwordHash,
    });
    return this.usersRepository.save(newUser);
  }

  // ==========================================
  // CONFIGURACIÓN DE ALERTAS DE PRECIO
  // ==========================================
  async updateAlertSettings(
    userId: number,
    alertaPrecioActiva: boolean,
    alertaPrecioObjetivo: number,
    expoPushToken?: string,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.alertaPrecioActiva = alertaPrecioActiva;
    user.alertaPrecioObjetivo = alertaPrecioObjetivo;

    if (expoPushToken) {
      // Nuevo token recibido → actualizarlo
      user.expoPushToken = expoPushToken;
    } else if (!alertaPrecioActiva) {
      // Desactivando alertas sin token → limpiar token viejo
      user.expoPushToken = null;
    }
    // Si alertaPrecioActiva=true pero sin token nuevo → mantener token existente

    return this.usersRepository.save(user);
  }

  // ==========================================
  // BUSCAR USUARIOS PARA EL CRON JOB
  // ==========================================
  async getUsersWithActiveAlerts(): Promise<User[]> {
    return this.usersRepository.find({
      where: {
        alertaPrecioActiva: true,
        expoPushToken: Not(IsNull()),
      },
    });
  }

  // ==========================================
  // FUNCIONES PARA RECUPERAR CONTRASEÑA
  // ==========================================

  async saveResetToken(userId: number, code: string, expires: Date): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.resetPasswordCode = code;
    user.resetPasswordExpires = expires;
    return this.usersRepository.save(user);
  }

  async updatePassword(userId: number, newPasswordHash: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.passwordHash = newPasswordHash;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    return this.usersRepository.save(user);
  }
}