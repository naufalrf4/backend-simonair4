import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';
import { User } from '../../users/entities/user.entity';

@Entity('calibrations')
@Index(['device_id', 'sensor_type', 'applied_at'])
export class Calibration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  device_id: string;

  @Column({ type: 'varchar', length: 20 })
  sensor_type: string;

  @Column({ type: 'jsonb' })
  calibration_data: Record<string, any>;

  @CreateDateColumn()
  applied_at: Date;

  @Column({ type: 'uuid', nullable: true })
  applied_by: string;

  // Relations
  @ManyToOne(() => Device, device => device.calibrations)
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: Device;

  @ManyToOne(() => User, user => user.calibrations)
  @JoinColumn({ name: 'applied_by' })
  applied_by_user: User;
}
