import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Exclude()
export class DeviceResponseDto {
  @Expose()
  id: string;

  @Expose()
  device_id: string;

  @Expose()
  device_name: string;

  @Expose()
  location: string;

  @Expose()
  aquarium_size: string;

  @Expose()
  glass_type: string;

  @Expose()
  fish_count: number;

  @Expose()
  @Type(() => String)
  last_seen: string;

  @Expose()
  is_active: boolean;

  @Expose()
  @Type(() => String)
  created_at: string;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
