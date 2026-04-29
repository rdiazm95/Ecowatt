import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Programacion } from './entities/programacion.entity';
import { User } from '../users/entities/user.entity';
import { Device } from '../devices/entities/device.entity';

@Injectable()
export class ProgramacionesService {
  constructor(
    @InjectRepository(Programacion)
    private readonly repo: Repository<Programacion>,
  ) {}

 async crear(userId: number, dto: any): Promise<Programacion> {
  const prog = this.repo.create({
    ...dto,
    usuario: { id: userId } as User,
    dispositivo: { id: dto.id_dispositivo } as Device,
  } as Programacion);
  return this.repo.save(prog);
}

  async findByUsuario(userId: number): Promise<Programacion[]> {
    return this.repo.find({
      where: { usuario: { id: userId } },
      relations: ['dispositivo'],
      order: { fecha: 'DESC', horaInicio: 'ASC' },
    });
  }

  async eliminar(id: number, userId: number): Promise<void> {
    const prog = await this.repo.findOne({
      where: { id, usuario: { id: userId } },
    });
    if (!prog) {
      throw new NotFoundException('Programación no encontrada o no te pertenece');
    }
    await this.repo.delete(id);
  }
}