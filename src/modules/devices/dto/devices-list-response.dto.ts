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

  @ApiProperty({ type: [DeviceResponseDto] })
  data: DeviceResponseDto[];

  @ApiProperty({ type: PaginationMetadata })
  metadata: PaginationMetadata;
}
