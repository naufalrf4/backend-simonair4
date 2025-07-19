import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

@Entity('manual_measurements')
@Index(['device_id', 'measurement_timestamp'])
@Index(['device_id', 'created_at'])
@Index(['measured_by', 'created_at'])
export class ManualMeasurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  device_id: string;

  @Column({ type: 'uuid' })
  measured_by: string;

  @Column({ type: 'timestamptz' })
  measurement_timestamp: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  ph: number | null;

  @Column({ type: 'int', nullable: true })
  tds: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  do_level: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Device, device => device.manual_measurements)
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: Device;

  @ManyToOne(() => User, user => user.manual_measurements)
  @JoinColumn({ name: 'measured_by' })
  user: User;
}
