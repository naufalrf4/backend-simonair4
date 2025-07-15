import { IsString, IsNotEmpty, Matches, IsOptional, IsInt, Min } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^SMNR-[A-Z0-9]{4}$/, {
    message: 'Device ID must be in the format SMNR-XXXX where XXXX is alphanumeric',
  })
  device_id: string;

  @IsString()
  @IsNotEmpty()
  device_name: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  aquarium_size?: string;

  @IsString()
  @IsOptional()
  glass_type?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  fish_count?: number;
}