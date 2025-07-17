import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/guards/roles-guard';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Sensors')
@Controller('sensors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get(':deviceId/latest')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get latest sensor data',
    description: 'Retrieves the most recent sensor reading for a device',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID (format: SMNR-XXXX)',
    example: 'SMNR-0001',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest sensor data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found or no sensor data available',
  })
  async getLatestSensorData(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.sensorsService.getLatestSensorData(deviceId);
    return {
      status: 'success',
      data,
    };
  }

  @Get(':deviceId/history')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get historical sensor data with pagination',
    description:
      'Retrieves historical sensor data for a device with pagination and date filtering',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID (format: SMNR-XXXX)',
    example: 'SMNR-0001',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO format)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (ISO format)',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description: 'Sort order (ASC or DESC, default: DESC)',
    example: 'DESC',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical sensor data retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async getHistoricalDataPaginated(
    @Param('deviceId') deviceId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('orderBy') orderBy: 'ASC' | 'DESC' = 'DESC',
  ) {
    // Validate and limit the page size
    const validatedLimit = Math.min(Math.max(limit, 1), 100);
    const validatedPage = Math.max(page, 1);

    const options: any = {
      page: validatedPage,
      limit: validatedLimit,
      orderBy,
    };

    if (from) {
      options.from = new Date(from);
    }
    if (to) {
      options.to = new Date(to);
    }

    const result = await this.sensorsService.getHistoricalDataWithPagination(
      deviceId,
      options,
    );

    return {
      status: 'success',
      data: result.data,
      metadata: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('history/:deviceId')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get historical sensor data (legacy)',
    description: 'Legacy endpoint for historical data without pagination',
  })
  getHistoricalData(
    @Param('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: User,
  ) {
    return this.sensorsService.getHistoricalData(
      deviceId,
      new Date(from),
      new Date(to),
    );
  }

  @Get(':deviceId/aggregate')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get aggregated sensor data with pagination',
    description: 'Retrieves aggregated sensor data with pagination support',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID (format: SMNR-XXXX)',
    example: 'SMNR-0001',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Start date (ISO format)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'End date (ISO format)',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'granularity',
    required: true,
    description: 'Data granularity (hourly or daily)',
    example: 'daily',
  })
  async getAggregatedDataPaginated(
    @Param('deviceId') deviceId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('granularity') granularity: 'hourly' | 'daily',
    @CurrentUser() user: User,
  ) {
    // Validate and limit the page size
    const validatedLimit = Math.min(Math.max(limit, 1), 100);
    const validatedPage = Math.max(page, 1);

    const result = await this.sensorsService.getAggregatedDataWithPagination(
      deviceId,
      {
        page: validatedPage,
        limit: validatedLimit,
        from: new Date(from),
        to: new Date(to),
        granularity,
      },
    );

    return {
      status: 'success',
      data: result.data,
      metadata: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
        granularity,
      },
    };
  }

  @Get('aggregate/:deviceId')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get aggregated sensor data (legacy)',
    description: 'Legacy endpoint for aggregated data without pagination',
  })
  getAggregatedData(
    @Param('deviceId') deviceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('granularity') granularity: 'hourly' | 'daily',
    @CurrentUser() user: User,
  ) {
    return this.sensorsService.getAggregatedData(
      deviceId,
      new Date(from),
      new Date(to),
      granularity,
    );
  }
}
