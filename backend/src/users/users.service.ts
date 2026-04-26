import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm'; // <-- Añadido Not e IsNull
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Busca un usuario por su email (lo usaremos para el Login)
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Guarda un nuevo usuario en la base de datos
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
      user.expoPushToken = expoPushToken;
    }

    return this.usersRepository.save(user);
  }

  // ==========================================
  // NUEVO: BUSCAR USUARIOS PARA EL CRON JOB
  // ==========================================
  async getUsersWithActiveAlerts(): Promise<User[]> {
    return this.usersRepository.find({
      where: {
        alertaPrecioActiva: true,
        expoPushToken: Not(IsNull()), // Solo usuarios que tengan un token válido
      },
    });
  }
}