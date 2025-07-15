import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';

@Controller('sensors')
@UseGuards(JwtAuthGuard)
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get('history/:deviceId')
  getHistoricalData(
    @Param('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.sensorsService.getHistoricalData(
      deviceId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('aggregate/:deviceId')
  getAggregatedData(
    @Param('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('granularity') granularity: 'hourly' | 'daily',
  ) {
    return this.sensorsService.getAggregatedData(
      deviceId,
      new Date(from),
      new Date(to),
      granularity,
    );
  }
}
