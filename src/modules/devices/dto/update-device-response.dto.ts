import { ApiProperty } from '@nestjs/swagger';

class UserDetails {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;
}

class UpdatedDevice {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'SMNR-0001' })
  device_id: string;

  @ApiProperty({ example: 'Updated Aquarium Name' })
  device_name: string;

  @ApiProperty({ example: 'Bedroom', nullable: true })
  location: string;

  @ApiProperty({ example: '50x30x30 cm', nullable: true })
  aquarium_size: string;

  @ApiProperty({ example: 'Tempered Glass', nullable: true })
  glass_type: string;

  @ApiProperty({ example: 15 })
  fish_count: number;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z', nullable: true })
  last_seen: string;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  created_at: string;

  @ApiProperty({ type: UserDetails })
  user: UserDetails;
}

export class UpdateDeviceResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: UpdatedDevice })
  data: UpdatedDevice;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/devices/SMNR-0001',
      executionTime: 72,
    },
  })
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
  };
}
