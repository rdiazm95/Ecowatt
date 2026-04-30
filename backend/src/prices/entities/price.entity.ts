import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('prices')
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'timestamp' })
  datetime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 5 })
  value: number; // €/MWh

  @Column({ type: 'decimal', precision: 10, scale: 5 })
  valueKwh: number; // €/kWh (value / 1000)

  // --- NUEVA COLUMNA: Huella de Carbono ---
  @Column({ type: 'decimal', precision: 10, scale: 5, nullable: true })
  carbonFootprint: number; // gCO2eq/kWh (o la unidad devuelta por ESIOS)

  @Column({ default: 'peninsula' })
  geoZone: string;

  @Column({ default: 1001 })
  indicatorId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  
  date: string | number | Date;
}