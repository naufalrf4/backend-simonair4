import { Device } from '@/modules/devices/entities/device.entity';
import { User } from '@/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';

@Entity('thresholds')
export class Threshold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', type: 'varchar', length: 20, unique: true })
  deviceId: string;

  @Column({ name: 'threshold_data', type: 'jsonb' })
  thresholdData: Record<string, any>;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'now()' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'ack_status', type: 'varchar', length: 20, default: 'pending' })
  ackStatus: string;

  @Column({ name: 'ack_received_at', type: 'timestamp', nullable: true })
  ackReceivedAt: Date | null;

  // Relations (optional but recommended if you use relations)

  @OneToOne(() => Device, (device) => device.threshold, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: Device;

  @ManyToOne(() => User, (user) => user.updatedThresholds, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;
}
