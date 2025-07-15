import { IsOptional, IsEnum, IsString, IsBoolean, IsInt, Min, Max, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '@/modules/users/entities/user.entity';

export class UserQueryDto {
  @IsOptional()
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be one of: superuser, admin, user' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'Email verified must be a boolean' })
  @Transform(({ value }) => value === 'true')
  email_verified?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Is active must be a boolean' })
  @Transform(({ value }) => value === 'true')
  is_active?: boolean;

  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  created_at_from?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  created_at_to?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  last_login_from?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  last_login_to?: Date;
}
