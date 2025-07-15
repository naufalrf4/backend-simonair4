import { ApiProperty } from '@nestjs/swagger';

class DeleteUserData {
  @ApiProperty({ example: 'User deleted successfully' })
  message: string;
}

export class DeleteUserResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: DeleteUserData })
  data: DeleteUserData;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/users/550e8400-e29b-41d4-a716-446655440000',
      executionTime: 65,
    },
  })
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
  };
}
