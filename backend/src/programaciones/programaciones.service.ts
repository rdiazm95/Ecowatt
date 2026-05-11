import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Programacion } from './entities/programacion.entity';
import { User } from '../users/entities/user.entity';
import { Device } from '../devices/entities/device.entity';

/** Devuelve la fecha local en España como string 'YYYY-MM-DD' */
function getLocalDateSpain(): string {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Europe/Madrid',
  });
}

/** Suma N días a un string 'YYYY-MM-DD' y devuelve el nuevo string */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}

@Injectable()
export class ProgramacionesService {
  constructor(
    @InjectRepository(Programacion)
    private readonly repo: Repository<Programacion>,
  ) {}

  async crear(userId: number, dto: any): Promise<Programacion> {
    // Fecha base: siempre la fecha actual en hora española
    const fechaBase = getLocalDateSpain();

    // Detectar cruce de medianoche: horaFin < horaInicio
    // En ese caso la programación empieza hoy y termina mañana.
    // La fecha que guardamos es siempre la del día de INICIO (fechaBase),
    // que es la correcta. No sumamos un día.
    //
    // EXCEPCIÓN: si horaInicio es 0 (medianoche en punto),
    // la fecha ya es la de hoy en hora española → correcto.
    //
    // No hay ningún caso en que debamos restar un día porque
    // getLocalDateSpain() ya usa la zona horaria de Madrid.
    const fecha = dto.fecha ?? fechaBase;

    const prog = this.repo.create({
      ...dto,
      fecha,
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