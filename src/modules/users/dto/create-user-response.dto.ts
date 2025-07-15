import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

class CreatedUser {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'newuser@example.com' })
  email: string;

  @ApiProperty({ example: 'New User' })
  full_name: string;

  @ApiProperty({ enum: UserRole, example: 'user' })
  role: UserRole;

  @ApiProperty({ example: false })
  email_verified: boolean;

  @ApiProperty({ example: null })
  social_provider: string | null;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: null })
  last_login: string | null;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z' })
  updated_at: string;

  @ApiProperty({ example: 0 })
  device_count: number;

  @ApiProperty({ example: false })
  is_social_login: boolean;
}

export class CreateUserResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: CreatedUser })
  data: CreatedUser;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/users',
      executionTime: 150,
    },
  })
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
  };
}
