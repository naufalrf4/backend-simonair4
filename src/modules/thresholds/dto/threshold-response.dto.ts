import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class ThresholdResponseDto {
  @Expose()
  device_id: string;

  @Expose()
  @Type(() => Object)
  thresholds: Record<string, any>;

  @Expose()
  updated_at: Date;

  constructor(partial: Partial<ThresholdResponseDto>) {
    Object.assign(this, partial);
  }
}