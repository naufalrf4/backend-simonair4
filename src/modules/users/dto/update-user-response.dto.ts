import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

class UpdatedUser {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Updated User Name' })
  full_name: string;

  @ApiProperty({ enum: UserRole, example: 'admin' })
  role: UserRole;

  @ApiProperty({ example: true })
  email_verified: boolean;

  @ApiProperty({ example: null })
  social_provider: string | null;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z' })
  last_login: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z' })
  updated_at: string;

  @ApiProperty({ example: 2 })
  device_count: number;

  @ApiProperty({ example: false })
  is_social_login: boolean;
}

export class UpdateUserResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: UpdatedUser })
  data: UpdatedUser;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/users/550e8400-e29b-41d4-a716-446655440000',
      executionTime: 80,
    },
  })
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
  };
}
