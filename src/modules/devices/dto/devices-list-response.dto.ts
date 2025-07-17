import { ApiProperty } from '@nestjs/swagger';
import { DeviceResponseDto } from './device-response.dto';

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

  @ApiProperty({
    example: [
      {
        id: 'd65e7f80-e099-459a-a494-3884c355aade',
        device_id: 'SMNR-0001',
        device_name: 'Living Room Aquarium',
        user: {
          id: '20998f94-c5ec-432b-96d6-d1e868ee1d40',
          name: 'Naufal Rizqullah Firdaus',
        },
        latestSensorData: {
          temperature: 28.6,
          ph: 7.03,
          tds: 1416,
        },
      },
    ],
  })
  data: any[];

  @ApiProperty({
    example: { total: 1, page: 1, limit: 10 },
  })
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}
