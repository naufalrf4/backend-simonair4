import { ApiProperty } from '@nestjs/swagger';

class ErrorDetails {
  @ApiProperty({ example: 404 })
  code: number;

  @ApiProperty({ example: 'Not Found' })
  message: string;

  @ApiProperty({ example: 'Device with ID "SMNR-9999" not found' })
  details: string | string[];
}

export class DeviceErrorResponseDto {
  @ApiProperty({ example: 'error' })
  status: string;

  @ApiProperty({ type: ErrorDetails })
  error: ErrorDetails;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/devices/SMNR-9999',
    },
  })
  metadata: {
    timestamp: string;
    path: string;
  };
}
