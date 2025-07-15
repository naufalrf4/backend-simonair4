import { ApiProperty } from '@nestjs/swagger';

class ErrorDetails {
  @ApiProperty({ example: 404 })
  code: number;

  @ApiProperty({ example: 'Not Found' })
  message: string;

  @ApiProperty({ example: 'User not found' })
  details: string | string[];
}

export class UserErrorResponseDto {
  @ApiProperty({ example: 'error' })
  status: string;

  @ApiProperty({ type: ErrorDetails })
  error: ErrorDetails;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/users/invalid-uuid',
    },
  })
  metadata: {
    timestamp: string;
    path: string;
  };
}
