import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

@Entity('feed_data')
@Index(['device_id', 'created_at'])
export class FeedData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  device_id: string;

  @Column({ type: 'varchar', length: 255 })
  feed_name: string;

  @Column({ type: 'varchar', length: 50 })
  feed_type: string;

  @Column({ type: 'jsonb', nullable: true })
  feeding_schedule: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Device, device => device.feed_data)
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: Device;
}
