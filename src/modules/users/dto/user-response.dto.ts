import { Exclude, Expose, Transform } from 'class-transformer';
import { UserRole } from '@/modules/users/entities/user.entity';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  full_name: string;

  @Expose()
  role: UserRole;

  @Expose()
  email_verified: boolean;

  @Expose()
  social_provider: string;

  @Expose()
  is_active: boolean;

  @Expose()
  last_login: Date;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.devices?.length || 0)
  device_count: number;

  @Expose()
  @Transform(({ obj }) => !!obj.social_provider)
  is_social_login: boolean;

  @Exclude()
  password_hash: string;

  @Exclude()
  reset_token: string;

  @Exclude()
  reset_token_expires: Date;

  @Exclude()
  verification_token: string;

  @Exclude()
  social_id: string;
}
