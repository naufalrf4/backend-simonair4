import { ApiProperty } from '@nestjs/swagger';

class DeleteDeviceData {
  @ApiProperty({ example: 'Device deleted successfully' })
  message: string;
}

export class DeleteDeviceResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: DeleteDeviceData })
  data: DeleteDeviceData;

  @ApiProperty({
    example: {
      timestamp: '2023-07-15T14:30:00.000Z',
      path: '/devices/SMNR-0001',
      executionTime: 58,
    },
  })
  metadata: {
    timestamp: string;
    path: string;
    executionTime: number;
  };
}
