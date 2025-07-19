import { ApiProperty } from '@nestjs/swagger';

class ErrorDetails {
  @ApiProperty({ example: 409 })
  code: number;

  @ApiProperty({ example: 'Conflict' })
  message: string;

  @ApiProperty({ example: 'Email already exists' })
  details: string[];
}

export class AuthErrorResponseDto {
  @ApiProperty({ example: 'error' })
  status: string;

  @ApiProperty({ type: ErrorDetails })
  error: ErrorDetails;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/auth/register',
    },
  })
  metadata: {
    timestamp: string;
    path: string;
  };
}
