import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
// Forward reference to avoid circular imports
import { Calibration } from '../../calibrations/entities/calibration.entity';
import { WaterQualityEvent } from '../../events/entities/water-quality-event.entity';
import { Threshold } from '../../thresholds/entities/threshold.entity';
import { ManualMeasurement } from '../../manual-measurements/entities/manual-measurement.entity';

export enum UserRole {
  SUPERUSER = 'superuser',
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role', 'email_verified'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  password_hash: string | null;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', length: 50, nullable: true })
  social_provider: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  social_id: string | null;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  reset_token: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  reset_token_expires: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  verification_token: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_login: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany('Device', 'user')
  devices: any[];

  @OneToMany(() => Calibration, (calibration) => calibration.applied_by_user)
  calibrations: Calibration[];

  @OneToMany(() => WaterQualityEvent, (event) => event.created_by_user)
  water_quality_events: WaterQualityEvent[];

  @OneToMany(() => ManualMeasurement, (manualMeasurement) => manualMeasurement.user)
  manual_measurements: ManualMeasurement[];

  @OneToMany(() => Threshold, (threshold) => threshold.updatedByUser)
  updatedThresholds: Threshold[];

  // Virtual fields
  get device_count(): number {
    return this.devices?.length || 0;
  }

  get is_social_login(): boolean {
    return !!this.social_provider;
  }
}
