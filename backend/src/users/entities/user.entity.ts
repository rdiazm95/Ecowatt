import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Device } from '../../devices/entities/device.entity'; // <-- 1. Importar la nueva entidad

@Entity('usuario')
export class User {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @CreateDateColumn({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;

  // --- RELACIÓN CON DISPOSITIVOS ---
  // Un usuario tiene Muchos dispositivos
  @OneToMany(() => Device, (device) => device.usuario)
  dispositivos: Device[];
}