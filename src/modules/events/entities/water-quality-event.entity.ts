import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

@Entity('water_quality_events')
@Index(['device_id', 'event_date'])
@Index(['event_type', 'event_date'])
export class WaterQualityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  device_id: string;

  @Column({ type: 'varchar', length: 50 })
  event_type: string;

  @Column({ type: 'date' })
  event_date: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Device, device => device.water_quality_events)
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: Device;

  @ManyToOne(() => User, user => user.water_quality_events)
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;
}
