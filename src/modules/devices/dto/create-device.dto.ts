import { IsString, IsNotEmpty, Matches, IsOptional, IsInt, Min, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Unique device identifier in format SMNR-XXXX where XXXX is alphanumeric',
    example: 'SMNR-A1B2',
    pattern: '^SMNR-[A-Z0-9]{4}$'
  })
  @IsString({ message: 'Device ID must be a string' })
  @IsNotEmpty({ message: 'Device ID is required and cannot be empty' })
  @Matches(/^SMNR-[A-Z0-9]{4}$/, {
    message: 'Device ID must be in the format SMNR-XXXX where XXXX is exactly 4 alphanumeric characters (A-Z, 0-9)',
  })
  device_id: string;

  @ApiProperty({
    description: 'Human-readable name for the device',
    example: 'Living Room Aquarium Monitor',
    minLength: 1,
    maxLength: 255
  })
  @IsString({ message: 'Device name must be a string' })
  @IsNotEmpty({ message: 'Device name is required and cannot be empty' })
  @MinLength(1, { message: 'Device name must be at least 1 character long' })
  @MaxLength(255, { message: 'Device name cannot exceed 255 characters' })
  device_name: string;

  @ApiProperty({
    description: 'Physical location of the device',
    example: 'Living Room',
    required: false,
    maxLength: 255
  })
  @IsString({ message: 'Location must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Location cannot exceed 255 characters' })
  location?: string;

  @ApiProperty({
    description: 'Size dimensions of the aquarium',
    example: '50x30x30 cm',
    required: false,
    maxLength: 50
  })
  @IsString({ message: 'Aquarium size must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Aquarium size cannot exceed 50 characters' })
  aquarium_size?: string;

  @ApiProperty({
    description: 'Type of glass used in the aquarium',
    example: 'Tempered Glass',
    required: false,
    maxLength: 50
  })
  @IsString({ message: 'Glass type must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Glass type cannot exceed 50 characters' })
  glass_type?: string;

  @ApiProperty({
    description: 'Number of fish in the aquarium',
    example: 10,
    required: false,
    minimum: 0
  })
  @IsInt({ message: 'Fish count must be an integer' })
  @Min(0, { message: 'Fish count cannot be negative' })
  @IsOptional()
  fish_count?: number;
}