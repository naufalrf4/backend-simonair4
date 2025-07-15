import { Controller, Post, Get, Put, Param, Body, UseGuards, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { ThresholdsService } from './thresholds.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { ThresholdResponseDto } from './dto/threshold-response.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Thresholds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('devices/:deviceId/thresholds')
export class ThresholdsController {
  constructor(private readonly thresholdsService: ThresholdsService) {}

  @Post()
  @ApiOperation({ summary: 'Set or create thresholds for a device' })
  @ApiResponse({ status: 201, description: 'Thresholds set successfully.', type: ThresholdResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async setThreshold(
    @Param('deviceId') deviceId: string,
    @Body() createThresholdDto: CreateThresholdDto,
    @CurrentUser() user: User,
  ): Promise<ThresholdResponseDto> {
    const threshold = await this.thresholdsService.setThreshold(deviceId, createThresholdDto, user);
    return new ThresholdResponseDto({
      device_id: threshold.deviceId,
      thresholds: threshold.thresholdData,
      updated_at: threshold.updatedAt,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get thresholds for a device' })
  @ApiResponse({ status: 200, description: 'Thresholds retrieved successfully.', type: ThresholdResponseDto })
  @ApiResponse({ status: 404, description: 'Device or thresholds not found.' })
  async getThreshold(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ): Promise<ThresholdResponseDto> {
    const threshold = await this.thresholdsService.getThreshold(deviceId, user);
    return new ThresholdResponseDto({
      device_id: threshold.deviceId,
      thresholds: threshold.thresholdData,
      updated_at: threshold.updatedAt,
    });
  }

  @Put()
  @ApiOperation({ summary: 'Update thresholds for a device' })
  @ApiResponse({ status: 200, description: 'Thresholds updated successfully.', type: ThresholdResponseDto })
  async updateThreshold(
    @Param('deviceId') deviceId: string,
    @Body() updateThresholdDto: UpdateThresholdDto,
    @CurrentUser() user: User,
  ): Promise<ThresholdResponseDto> {
    const threshold = await this.thresholdsService.updateThreshold(deviceId, updateThresholdDto, user);
    return new ThresholdResponseDto({
      device_id: threshold.deviceId,
      thresholds: threshold.thresholdData,
      updated_at: threshold.updatedAt,
    });
  }
}