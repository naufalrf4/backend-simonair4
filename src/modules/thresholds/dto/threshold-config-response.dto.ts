import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class ThresholdConfigResponseDto {
  @ApiProperty({
    description: 'Device ID',
    example: 'SMNR-1234',
  })
  @Expose()
  device_id: string;

  @ApiProperty({
    description: 'Current threshold configuration',
    example: {
      ph_min: '6.5',
      ph_max: '8.5',
      tds_min: '200',
      tds_max: '800',
      do_min: '5.0',
      do_max: '12.0',
      temp_min: '20.0',
      temp_max: '30.0',
    },
  })
  @Expose()
  @Type(() => Object)
  thresholds: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when threshold was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  updated_at: Date;

  @ApiProperty({
    description: 'MQTT acknowledgment status',
    example: 'success',
    enum: ['pending', 'success', 'failed'],
  })
  @Expose()
  ack_status: string;

  @ApiProperty({
    description: 'Indicates if current thresholds are active on device',
    example: true,
  })
  @Expose()
  get is_active(): boolean {
    return this.ack_status === 'success';
  }

  constructor(partial: Partial<ThresholdConfigResponseDto>) {
    Object.assign(this, partial);
  }
}
