import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

@Entity('fish_growth')
@Index(['device_id', 'measurement_date'])
export class FishGrowth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  device_id: string;

  @Column({ type: 'date' })
  measurement_date: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  length_cm: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight_gram: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  biomass_kg: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  condition_indicator: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Device, device => device.fish_growth)
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: Device;
}
