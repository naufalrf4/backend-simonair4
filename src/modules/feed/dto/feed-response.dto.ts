import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FeedResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  device_id: string;

  @ApiProperty()
  @Expose()
  feed_name: string;

  @ApiProperty()
  @Expose()
  feed_type: string;

  @ApiProperty()
  @Expose()
  feeding_schedule: Record<string, any>;

  @ApiProperty()
  @Expose()
  created_at: Date;
}
