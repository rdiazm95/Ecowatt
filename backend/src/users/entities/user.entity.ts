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
  // COLUMNAS PARA ALERTAS DE PRECIO
  // ==========================================

  // Indica si el usuario tiene el interruptor activado
  @Column({ name: 'alerta_precio_activa', type: 'boolean', default: false })
  alertaPrecioActiva: boolean;

  // El precio límite que el usuario pone en el input
  @Column({ name: 'alerta_precio_objetivo', type: 'float', nullable: true, default: 0 })
  alertaPrecioObjetivo: number | null; // <-- Añadido | null por precaución

  // La "dirección" del móvil para enviarle la notificación push
  @Column({ name: 'expo_push_token', type: 'varchar', length: 255, nullable: true })
  expoPushToken: string | null; // <-- Añadido | null por precaución

  // ==========================================
  // NUEVO: COLUMNAS PARA RECUPERAR CONTRASEÑA
  // ==========================================
  
  @Column({ name: 'reset_password_code', type: 'varchar', length: 6, nullable: true })
  resetPasswordCode: string | null; 

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null; 
}