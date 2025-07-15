import { ApiProperty } from '@nestjs/swagger';

class ChangePasswordData {
  @ApiProperty({ example: 'Password changed successfully' })
  message: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: ChangePasswordData })
  data: ChangePasswordData;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/users/change-password',
      executionTime: 100,
    },
  })
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
  };
}
