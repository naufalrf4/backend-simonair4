import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class ThresholdResponseDto {
  @ApiProperty({
    description: 'Device ID',
    example: 'SMNR-1234',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Device ID',
    example: 'SMNR-1234',
  })
  @Expose()
  device_id: string;

  @ApiProperty({
    description: 'Threshold configuration data',
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
  threshold_data: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when threshold was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  updated_at: Date;

  @ApiProperty({
    description: 'User ID who updated the threshold',
    example: 'user-uuid-123',
  })
  @Expose()
  updated_by: string | null;

  @ApiProperty({
    description: 'MQTT acknowledgment status',
    example: 'pending',
    enum: ['pending', 'success', 'failed'],
  })
  @Expose()
  ack_status: string;

  @ApiProperty({
    description: 'Timestamp when MQTT acknowledgment was received',
    example: '2024-01-15T10:30:05Z',
    required: false,
  })
  @Expose()
  ack_received_at: Date | null;

  @ApiProperty({
    description: 'Indicates if MQTT message was successfully published',
    example: true,
  })
  @Expose()
  mqtt_published: boolean;

  constructor(partial: Partial<ThresholdResponseDto>) {
    Object.assign(this, partial);
  }
}
