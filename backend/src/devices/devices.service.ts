import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { User } from '../users/entities/user.entity';
import { Programacion } from '../programaciones/entities/programacion.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,

    @InjectRepository(Programacion)
    private programacionRepository: Repository<Programacion>,
  ) {}

  // 1. CREAR: Guarda un dispositivo vinculándolo al usuario logueado
  async create(deviceData: Partial<Device>, userId: number): Promise<Device> {
    const newDevice = this.devicesRepository.create({
      ...deviceData,
      usuario: { id: userId } as User,
    });
    return this.devicesRepository.save(newDevice);
  }

  // 2. LEER: Busca solo los dispositivos que pertenezcan a este usuario
  async findAllByUserId(userId: number): Promise<Device[]> {
    return this.devicesRepository.find({
      where: { usuario: { id: userId } },
    });
  }

  // 3. ACTUALIZAR: Modifica los datos de un dispositivo existente
  //    y propaga el nuevo nombre/potencia a sus programaciones
  async update(deviceId: number, userId: number, updateData: Partial<Device>): Promise<Device> {
    // Primero buscamos que el dispositivo exista y pertenezca a este usuario
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId, usuario: { id: userId } },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado o no te pertenece');
    }

    // Fusionamos los datos antiguos con los nuevos
    Object.assign(device, updateData);

    // Lo guardamos de vuelta en la base de datos
    const saved = await this.devicesRepository.save(device);

    // ── Propagar potencia a programaciones existentes ──────────────────────
    // Device.potencia está en kW; Programacion.potenciaW está en W
    if (updateData.potencia !== undefined) {
      const nuevaPotenciaW = Number(updateData.potencia) * 1000;
      await this.programacionRepository
        .createQueryBuilder()
        .update(Programacion)
        .set({ potenciaW: nuevaPotenciaW })
        .where('id_dispositivo = :deviceId', { deviceId })
        .execute();
    }

    return saved;
  }

  // 4. ELIMINAR: Borra un dispositivo (asegurándose de que sea del usuario correcto)
  async remove(deviceId: number, userId: number): Promise<void> {
    await this.devicesRepository.delete({
      id: deviceId,
      usuario: { id: userId },
    });
  }
}