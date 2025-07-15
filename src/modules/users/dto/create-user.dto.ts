// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsBoolean, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@/modules/users/entities/user.entity';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password?: string;

  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Full name must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  full_name: string;

  @IsEnum(UserRole, { message: 'Role must be one of: superuser, admin, user' })
  @IsOptional()
  role?: UserRole = UserRole.USER;

  @IsBoolean({ message: 'Email verified must be a boolean' })
  @IsOptional()
  email_verified?: boolean = false;

  @IsString({ message: 'Social provider must be a string' })
  @IsOptional()
  social_provider?: string;

  @IsString({ message: 'Social ID must be a string' })
  @IsOptional()
  social_id?: string;

  @IsBoolean({ message: 'Is active must be a boolean' })
  @IsOptional()
  is_active?: boolean = true;
}
