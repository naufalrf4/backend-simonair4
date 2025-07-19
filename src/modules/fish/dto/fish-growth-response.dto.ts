import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class FishGrowthResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the fish growth record',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Device identifier',
    example: 'DEV001',
  })
  @Expose()
  device_id: string;

  @ApiProperty({
    description: 'Date of measurement',
    example: '2025-01-15',
  })
  @Expose()
  measurement_date: Date;

  @ApiProperty({
    description: 'Length of fish in centimeters',
    example: 25.5,
    nullable: true,
  })
  @Expose()
  length_cm?: number;

  @ApiProperty({
    description: 'Weight of fish in grams',
    example: 150.75,
    nullable: true,
  })
  @Expose()
  weight_gram?: number;

  @ApiProperty({
    description: 'Calculated biomass in kilograms',
    example: 3.825,
    nullable: true,
  })
  @Expose()
  biomass_kg?: number;

  @ApiProperty({
    description: 'Condition indicator based on length and weight',
    example: 'Good',
    nullable: true,
  })
  @Expose()
  condition_indicator?: string;

  @ApiProperty({
    description: 'Additional notes about the measurement',
    example: 'Fish appears healthy with good coloration',
    nullable: true,
  })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  @Expose()
  created_at: Date;
}

export class PaginatedFishGrowthResponseDto {
  @ApiProperty({
    description: 'Array of fish growth records',
    type: [FishGrowthResponseDto],
  })
  @Expose()
  @Type(() => FishGrowthResponseDto)
  data: FishGrowthResponseDto[];

  @ApiProperty({
    description: 'Total number of records',
    example: 150,
  })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @Expose()
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  @Expose()
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  @Expose()
  totalPages: number;

  @ApiProperty({
    description: 'Indicates if there are more pages',
    example: true,
  })
  @Expose()
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Indicates if there are previous pages',
    example: false,
  })
  @Expose()
  hasPreviousPage: boolean;
}
