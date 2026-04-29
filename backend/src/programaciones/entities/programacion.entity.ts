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

  @Column({ type: 'smallint', name: 'hora_inicio' })
  horaInicio: number;

  @Column({ type: 'smallint', name: 'hora_fin' })
  horaFin: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, name: 'duracion_horas' })
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