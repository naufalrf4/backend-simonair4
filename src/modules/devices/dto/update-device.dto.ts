import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateDeviceDto } from './create-device.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDeviceDto extends PartialType(
  OmitType(CreateDeviceDto, ['device_id'] as const),
) {
  @ApiProperty({
    description: 'Whether the device is active and can receive data',
    example: true,
    required: false,
  })
  @IsBoolean({
    message: 'Active status must be a boolean value (true or false)',
  })
  @IsOptional()
  is_active?: boolean;
}
