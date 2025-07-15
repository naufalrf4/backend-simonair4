import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@/modules/users/entities/user.entity';

export class UserResponseData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ example: false })
  emailVerified: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', nullable: true })
  lastLogin: Date | null;
}

export class AuthResponseData {
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token' 
  })
  accessToken: string;

  @ApiProperty({ type: UserResponseData })
  user: UserResponseData;
}

export class TokenResponseData {
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token' 
  })
  accessToken: string;
}

export class MessageResponseData {
  @ApiProperty({ example: 'Operation successful' })
  message: string;
}

export class GoogleAuthUrlData {
  @ApiProperty({ 
    example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
    description: 'Google OAuth URL' 
  })
  url: string;
}

export class ResetTokenStatusData {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: 'Token is valid', required: false })
  message?: string;
}