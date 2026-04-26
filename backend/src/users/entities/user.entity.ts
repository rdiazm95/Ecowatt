import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

@Entity('usuario') // Mantenemos tu nombre de tabla
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
  @OneToMany(() => Device, (device) => device.usuario)
  dispositivos: Device[];

  // ==========================================
  // NUEVAS COLUMNAS PARA ALERTAS DE PRECIO
  // ==========================================

  // Indica si el usuario tiene el interruptor de la foto activado
  @Column({ name: 'alerta_precio_activa', type: 'boolean', default: false })
  alertaPrecioActiva: boolean;

  // El precio límite que el usuario pone en el input de la foto
  @Column({ name: 'alerta_precio_objetivo', type: 'float', nullable: true, default: 0 })
  alertaPrecioObjetivo: number;

  // La "dirección" del móvil para enviarle la notificación push
  @Column({ name: 'expo_push_token', type: 'varchar', length: 255, nullable: true })
  expoPushToken: string;
}