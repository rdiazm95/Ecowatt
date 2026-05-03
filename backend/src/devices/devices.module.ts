import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { Device } from './entities/device.entity';
import { Programacion } from '../programaciones/entities/programacion.entity'; // ← AÑADIDO

@Module({
  // Importamos la entidad para que TypeORM cree la tabla 'dispositivo'
  imports: [TypeOrmModule.forFeature([Device, Programacion])], // ← Programacion añadida
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}