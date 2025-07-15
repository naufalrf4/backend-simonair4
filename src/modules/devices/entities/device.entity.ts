import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  OneToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SensorData } from '../../sensors/entities/sensor-data.entity';
import { FishGrowth } from '../../fish/entities/fish-growth.entity';
import { Calibration } from '../../calibrations/entities/calibration.entity';
import { WaterQualityEvent } from '../../events/entities/water-quality-event.entity';
import { FeedData } from '../../feed/entities/feed-data.entity';
import { Threshold } from '@/modules/thresholds/entities/threshold.entity';

@Entity('devices')
@Index(['device_id'], { unique: true })
@Index(['user_id', 'is_active'])
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  device_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  device_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  aquarium_size: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  glass_type: string;

  @Column({ type: 'int', default: 0 })
  fish_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_seen: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.devices)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => SensorData, (sensorData) => sensorData.device)
  sensor_data: SensorData[];

  @OneToMany(() => FishGrowth, (fishGrowth) => fishGrowth.device)
  fish_growth: FishGrowth[];

  @OneToMany(() => Calibration, (calibration) => calibration.device)
  calibrations: Calibration[];

  @OneToMany(() => WaterQualityEvent, (event) => event.device)
  water_quality_events: WaterQualityEvent[];

  @OneToMany(() => FeedData, (feedData) => feedData.device)
  feed_data: FeedData[];

  @OneToOne(() => Threshold, (threshold) => threshold.device)
  threshold: Threshold;
}
