import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class ConsumptionByType {
  @ApiProperty({ description: 'Total natural feed consumed in kilograms.' })
  @Expose()
  natural: number;

  @ApiProperty({ description: 'Total artificial feed consumed in kilograms.' })
  @Expose()
  artificial: number;
}

export class FeedAnalyticsResponseDto {
  @ApiProperty({ description: 'The calculated Feed Conversion Ratio (FCR).' })
  @Expose()
  feedConversionRatio: number;

  @ApiProperty({ description: 'Total feed consumed in kilograms.' })
  @Expose()
  totalFeedConsumedKg: number;

  @ApiProperty({ type: () => ConsumptionByType })
  @Expose()
  @Type(() => ConsumptionByType)
  consumptionByType: ConsumptionByType;

  @ApiProperty({
    description: 'Correlation between feed and growth.',
    example: 'Positive',
  })
  @Expose()
  correlation: string;

  @ApiProperty({
    description: 'A human-readable summary of the analytics.',
    example: 'Feed efficiency is high, with a positive correlation to growth.',
  })
  @Expose()
  summary: string;
}