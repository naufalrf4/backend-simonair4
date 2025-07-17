import { ApiProperty } from '@nestjs/swagger';

class UserInfo {
  @ApiProperty({ example: '20998f94-c5ec-432b-96d6-d1e868ee1d40' })
  id: string;

  @ApiProperty({ example: 'Naufal Rizqullah Firdaus' })
  name: string;
}

class LatestSensorData {
  @ApiProperty({ example: '2023-07-15T14:30:00.000Z', nullable: true })
  time: string | null;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z', nullable: true })
  timestamp: string | null;

  @ApiProperty({ example: 28.6, nullable: true })
  temperature: number | null;

  @ApiProperty({ example: 7.03, nullable: true })
  ph: number | null;

  @ApiProperty({ example: 1416, nullable: true })
  tds: number | null;

  @ApiProperty({ example: 8.2, nullable: true })
  do_level: number | null;
}

class DeviceListItem {
  @ApiProperty({ example: 'd65e7f80-e099-459a-a494-3884c355aade' })
  id: string;

  @ApiProperty({ example: 'SMNR-0001' })
  device_id: string;

  @ApiProperty({ example: 'Living Room Aquarium' })
  device_name: string;

  @ApiProperty({ example: 'Living Room', nullable: true })
  location: string | null;

  @ApiProperty({ example: '50x30x30 cm', nullable: true })
  aquarium_size: string | null;

  @ApiProperty({ example: 'Tempered Glass', nullable: true })
  glass_type: string | null;

  @ApiProperty({ example: 10 })
  fish_count: number;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z', nullable: true })
  last_seen: string | null;

  @ApiProperty({ example: '2023-07-15T14:30:00.000Z' })
  created_at: string;

  @ApiProperty({ type: UserInfo, nullable: true })
  user: UserInfo | null;

  @ApiProperty({ type: LatestSensorData, nullable: true })
  latestSensorData: LatestSensorData | null;
}

class PaginationMetadata {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}

export class DevicesListResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: [DeviceListItem] })
  data: DeviceListItem[];

  @ApiProperty({ type: PaginationMetadata })
  metadata: PaginationMetadata;
}
