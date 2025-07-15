import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

interface SensorReading {
  raw?: number;
  voltage?: number;
  calibrated?: number;
  calibrated_ok?: boolean;
  status?: 'GOOD' | 'BAD';
  value?: number;
}

@Entity('sensor_data')
@Index(['device_id', 'time'])
export class SensorData {
  @PrimaryColumn({ type: 'timestamptz' })
  time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  timestamp: Date;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  device_id: string;

  @Column({ type: 'jsonb', nullable: true })
  temperature: SensorReading;

  @Column({ type: 'jsonb', nullable: true })
  ph: SensorReading;

  @Column({ type: 'jsonb', nullable: true })
  tds: SensorReading;

  @Column({ type: 'jsonb', nullable: true })
  do_level: SensorReading;

  // Relations
  @ManyToOne(() => Device, device => device.sensor_data)
  @JoinColumn({ name: 'device_id', referencedColumnName: 'device_id' })
  device: Device;
}
