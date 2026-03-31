import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('dispositivo')
export class Device {
  @PrimaryGeneratedColumn({ name: 'id_dispositivo' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 50 })
  tipo: string;

  // Usamos decimal para potencias como 1.5 kW
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  potencia: number;

  // Duración típica en horas, ej: 2.5 horas
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  duracion: number;

  // --- RELACIÓN CON USUARIO ---
  // Muchos dispositivos pertenecen a Un usuario. Si se borra el usuario (CASCADE), se borran sus dispositivos.
  @ManyToOne(() => User, (user) => user.dispositivos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;
}