import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  UseInterceptors,
  ClassSerializerInterceptor,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ManualMeasurementsService } from './services/manual-measurements.service';
import { MeasurementComparisonService } from './services/measurement-comparison.service';
import { ManualMeasurement } from './entities/manual-measurement.entity';
import {
  CreateManualMeasurementDto,
  ManualMeasurementQueryDto,
  ManualMeasurementResponseDto,
  ManualMeasurementListResponseDto,
  MeasurementComparisonResponseDto,
  CompareManualMeasurementDto,
  PaginationMetaDto,
} from './dto';

@ApiTags('Manual Measurements')
@Controller('manual-measurements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class ManualMeasurementsController {
  constructor(
    private readonly manualMeasurementsService: ManualMeasurementsService,
    private readonly comparisonService: MeasurementComparisonService,
  ) {}

  @Post(':deviceId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new manual measurement',
    description: 'Submit a new manual sensor measurement with validation and duplicate detection',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device identifier',
    example: 'SMNR-0001',
  })
  @ApiBody({ type: CreateManualMeasurementDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Manual measurement created successfully',
    type: ManualMeasurementResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or validation errors',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Duplicate measurement detected',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device not found',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Param('deviceId') deviceId: string,
    @Body() createDto: CreateManualMeasurementDto,
    @Request() req: any,
  ): Promise<ManualMeasurementResponseDto> {
    const userId = req.user.sub;
    const result = await this.manualMeasurementsService.create(userId, deviceId, createDto);
    
    // Transform the result to match the response DTO
    return this.transformToResponseDto(result.measurement, result.comparison);
  }

  @Get(':deviceId')
  @ApiOperation({
    summary: 'Get all manual measurements for a device',
    description: 'Retrieve manual measurements with filtering, pagination, and optional comparison data',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device identifier',
    example: 'SMNR-0001',
  })
  @ApiQuery({ type: ManualMeasurementQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Manual measurements retrieved successfully',
    type: ManualMeasurementListResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(
    @Param('deviceId') deviceId: string,
    @Query() queryDto: ManualMeasurementQueryDto,
    @Request() req: any,
  ): Promise<ManualMeasurementListResponseDto> {
    const userId = req.user.sub;
    const result = await this.manualMeasurementsService.findAll(userId, deviceId, queryDto);
    
    // Transform to response format
    return {
      data: result.data.map(measurement => this.transformMeasurementToResponseDto(measurement)),
      meta: {
        page: result.page,
        limit: result.limit,
        offset: (result.page - 1) * result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
        hasNext: result.page < Math.ceil(result.total / result.limit),
        hasPrevious: result.page > 1,
      },
    };
  }

  @Get('record/:id')
  @ApiOperation({
    summary: 'Get a manual measurement by ID',
    description: 'Retrieve a specific manual measurement with optional comparison data',
  })
  @ApiParam({
    name: 'id',
    description: 'Manual measurement UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'include_comparison',
    required: false,
    type: Boolean,
    description: 'Include sensor data comparison',
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Manual measurement retrieved successfully',
    type: ManualMeasurementResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Manual measurement not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('include_comparison') includeComparison: boolean = false,
    @Request() req: any,
  ): Promise<ManualMeasurementResponseDto> {
    const userId = req.user.sub;
    const measurement = await this.manualMeasurementsService.findOne(userId, id);
    
    let comparison: MeasurementComparisonResponseDto | undefined;
    if (includeComparison) {
      try {
        const comparisonReport = await this.comparisonService.generateComparisonReport(measurement);
        comparison = this.transformComparisonToResponseDto(comparisonReport);
      } catch (error) {
        // Comparison is optional, so we continue without it
        comparison = undefined;
      }
    }
    
    return this.transformToResponseDto(measurement, comparison);
  }

  @Post('record/:id/compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compare manual measurement with sensor data',
    description: 'Compare a manual measurement with corresponding sensor data from the same time period',
  })
  @ApiParam({
    name: 'id',
    description: 'Manual measurement UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: CompareManualMeasurementDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comparison completed successfully',
    type: MeasurementComparisonResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Manual measurement not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid comparison parameters',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async compare(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() compareDto: CompareManualMeasurementDto,
    @Request() req: any,
  ): Promise<MeasurementComparisonResponseDto> {
    const userId = req.user.sub;
    
    // Validate that the ID in the path matches the DTO
    if (compareDto.manual_measurement_id !== id) {
      throw new BadRequestException('Manual measurement ID in path must match ID in request body');
    }

    // Get the measurement first
    const measurement = await this.manualMeasurementsService.findOne(userId, id);
    
    // Generate comparison report
    const comparisonReport = await this.comparisonService.generateComparisonReport(
      measurement,
      compareDto.time_window || 5,
    );

    return this.transformComparisonToResponseDto(comparisonReport);
  }

  // Helper methods for transforming entities to response DTOs
  private transformToResponseDto(
    measurement: ManualMeasurement,
    comparison?: any,
  ): ManualMeasurementResponseDto {
    return {
      id: measurement.id,
      device_id: measurement.device_id,
      measured_by: measurement.measured_by,
      measurement_timestamp: measurement.measurement_timestamp,
      temperature: measurement.temperature,
      ph: measurement.ph,
      tds: measurement.tds,
      do_level: measurement.do_level,
      notes: measurement.notes,
      created_at: measurement.created_at,
      user: {
        id: measurement.user?.id || measurement.measured_by,
        name: measurement.user?.full_name || 'Unknown User',
        email: measurement.user?.email || '',
      },
      device: {
        device_id: measurement.device?.device_id || measurement.device_id,
        device_name: measurement.device?.device_name || 'Unknown Device',
      },
      comparison: comparison ? {
        sensor_data_available: comparison.sensor_data_available,
        sensor_timestamp: comparison.sensor_timestamp,
        time_difference_minutes: comparison.time_difference_minutes,
        temperature_difference: comparison.differences?.temperature?.difference || null,
        ph_difference: comparison.differences?.ph?.difference || null,
        tds_difference: comparison.differences?.tds?.difference || null,
        do_level_difference: comparison.differences?.do_level?.difference || null,
        accuracy_assessment: comparison.overall_accuracy || 'POOR',
        flags: comparison.flags || [],
        sensor_values: comparison.sensor_data || null,
        manual_values: {
          temperature: measurement.temperature || undefined,
          ph: measurement.ph || undefined,
          tds: measurement.tds || undefined,
          do_level: measurement.do_level || undefined,
        },
      } : undefined,
    };
  }

  private transformMeasurementToResponseDto(measurement: ManualMeasurement): ManualMeasurementResponseDto {
    return this.transformToResponseDto(measurement);
  }

  private transformComparisonToResponseDto(comparisonReport: any): MeasurementComparisonResponseDto {
    return {
      manual_measurement_id: comparisonReport.manual_measurement_id || '',
      device_id: comparisonReport.device_id || '',
      manual_timestamp: comparisonReport.manual_timestamp || new Date(),
      sensor_data_available: comparisonReport.sensor_data_available,
      sensor_timestamp: comparisonReport.sensor_timestamp,
      time_difference_minutes: comparisonReport.time_difference_minutes,
      search_window_minutes: comparisonReport.search_window_minutes || 5,
      manual_values: {
        temperature: comparisonReport.manual_values?.temperature,
        ph: comparisonReport.manual_values?.ph,
        tds: comparisonReport.manual_values?.tds,
        do_level: comparisonReport.manual_values?.do_level,
      },
      sensor_values: comparisonReport.sensor_data ? {
        temperature: comparisonReport.sensor_data?.temperature,
        ph: comparisonReport.sensor_data?.ph,
        tds: comparisonReport.sensor_data?.tds,
        do_level: comparisonReport.sensor_data?.do_level,
      } : null,
      absolute_differences: comparisonReport.differences ? {
        temperature: comparisonReport.differences?.temperature?.difference,
        ph: comparisonReport.differences?.ph?.difference,
        tds: comparisonReport.differences?.tds?.difference,
        do_level: comparisonReport.differences?.do_level?.difference,
      } : null,
      percentage_differences: comparisonReport.differences ? {
        temperature: comparisonReport.differences?.temperature?.percentage,
        ph: comparisonReport.differences?.ph?.percentage,
        tds: comparisonReport.differences?.tds?.percentage,
        do_level: comparisonReport.differences?.do_level?.percentage,
      } : null,
      accuracy_assessment: comparisonReport.overall_accuracy || 'POOR',
      flags: comparisonReport.flags || [],
      summary: comparisonReport.summary || 'Comparison completed',
      recommendations: comparisonReport.recommendations || [],
      compared_at: comparisonReport.comparison_timestamp || new Date(),
      comparison_quality_score: comparisonReport.accuracy_score || 0,
    };
  }
}
