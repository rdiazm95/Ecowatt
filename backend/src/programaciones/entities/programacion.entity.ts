import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Device } from '../../devices/entities/device.entity';

@Entity('programacion')
export class Programacion {
  @PrimaryGeneratedColumn({ name: 'id_programacion' })
  id: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha: Date;

  // decimal(6,4): soporta 0.0000 a 99.9999 → cubre 00:00–23:59 sin problema
  @Column({ type: 'decimal', precision: 6, scale: 4, name: 'hora_inicio' })
  horaInicio: number;

  // decimal(7,4): soporta hasta 999.9999 → cubre también cruce de medianoche (hasta 47.x)
  @Column({ type: 'decimal', precision: 7, scale: 4, name: 'hora_fin' })
  horaFin: number;

  // decimal(6,4): soporta duraciones hasta 24.0000 horas con precisión de minutos
  @Column({ type: 'decimal', precision: 6, scale: 4, name: 'duracion_horas' })
  duracionHoras: number;

  @Column({ type: 'decimal', precision: 7, scale: 2, name: 'potencia_w' })
  potenciaW: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, name: 'coste_estimado', nullable: true })
  costeEstimado: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, name: 'coste_minimo_dia', nullable: true })
  costeMinimodia: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_dispositivo' })
  dispositivo: Device;
}