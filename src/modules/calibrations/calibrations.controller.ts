import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Put,
  Query,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CalibrationsService } from './calibrations.service';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { CalibrationResponseDto } from './dto/calibration-response.dto';
import { CalibrationRequestDto } from './dto/calibration-request.dto';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { plainToClass } from 'class-transformer';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { RolesGuard } from '@/core/auth/guards/roles-guard';
import {
  MqttBrokerUnavailableException,
  MqttPublishFailedException,
  InvalidDeviceIdFormatException,
  MqttPayloadValidationException,
} from '../mqtt/exceptions/mqtt.exceptions';
import { ErrorResponseDto } from '@/core/common/dto/error-response.dto';

@ApiTags('Device Calibrations')
@ApiBearerAuth()
@Controller('calibrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class CalibrationsController {
  private readonly logger = new Logger(CalibrationsController.name);

  constructor(private readonly calibrationsService: CalibrationsService) {}

  /**
   * Send calibration data to device via MQTT
   * New endpoint for MQTT device communication feature
   * Implements requirements 1.1, 1.8, 3.1, 3.2, 5.4, 7.4, 8.1, 8.2, 8.4
   */
  @Post('devices/:deviceId/calibrations')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send calibration data to device via MQTT',
    description:
      'Sends calibration data to the specified device using MQTT protocol. Supports pH, TDS, and DO sensor calibrations.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID in format SMNR-XXXX',
    example: 'SMNR-1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Calibration data sent successfully',
    type: CalibrationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid calibration data or device ID format',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Device not found or access denied',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'MQTT broker unavailable',
    type: ErrorResponseDto,
  })
  async sendCalibration(
    @Param('deviceId') deviceId: string,
    @Body() calibrationRequest: CalibrationRequestDto,
    @CurrentUser() user: User,
  ): Promise<CalibrationResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Calibration request received for device ${deviceId}`, {
        deviceId,
        sensorType: calibrationRequest.sensor_type,
        userId: user.id,
        userEmail: user.email,
      });

      // Call service with comprehensive error handling
      const result = await this.calibrationsService.sendCalibration(
        deviceId,
        calibrationRequest,
        user,
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(`Calibration sent successfully for device ${deviceId}`, {
        deviceId,
        sensorType: calibrationRequest.sensor_type,
        executionTime,
        calibrationId: result.id,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Handle MQTT-specific exceptions
      if (error instanceof InvalidDeviceIdFormatException) {
        this.logger.warn(`Invalid device ID format: ${deviceId}`, {
          deviceId,
          userId: user.id,
          executionTime,
          errorType: 'INVALID_DEVICE_ID',
        });
        throw new BadRequestException({
          message: error.message,
          code: 'INVALID_DEVICE_ID_FORMAT',
          deviceId,
        });
      }

      if (error instanceof MqttPayloadValidationException) {
        this.logger.warn(
          `Calibration payload validation failed for device ${deviceId}`,
          {
            deviceId,
            sensorType: calibrationRequest.sensor_type,
            userId: user.id,
            executionTime,
            errorType: 'PAYLOAD_VALIDATION',
            validationError: error.message,
          },
        );
        throw new BadRequestException({
          message: error.message,
          code: 'CALIBRATION_VALIDATION_FAILED',
          deviceId,
          sensorType: calibrationRequest.sensor_type,
        });
      }

      if (error instanceof MqttBrokerUnavailableException) {
        this.logger.error(`MQTT broker unavailable for device ${deviceId}`, {
          deviceId,
          userId: user.id,
          executionTime,
          errorType: 'MQTT_BROKER_UNAVAILABLE',
          originalError: error.message,
        });
        throw error; // Let the global exception filter handle this
      }

      if (error instanceof MqttPublishFailedException) {
        this.logger.error(
          `Failed to publish calibration for device ${deviceId}`,
          {
            deviceId,
            sensorType: calibrationRequest.sensor_type,
            userId: user.id,
            executionTime,
            errorType: 'MQTT_PUBLISH_FAILED',
            originalError: error.message,
          },
        );
        throw error; // Let the global exception filter handle this
      }

      // Handle device ownership/access errors
      if (
        error.message?.includes('not found') ||
        error.message?.includes('access denied')
      ) {
        this.logger.warn(
          `Device access denied for user ${user.id} and device ${deviceId}`,
          {
            deviceId,
            userId: user.id,
            executionTime,
            errorType: 'DEVICE_ACCESS_DENIED',
          },
        );
        throw new ForbiddenException({
          message: `Device ${deviceId} not found or access denied`,
          code: 'DEVICE_ACCESS_DENIED',
          deviceId,
        });
      }

      // Handle validation errors from service layer
      if (
        error.message?.includes('validation') ||
        error.message?.includes('invalid')
      ) {
        this.logger.warn(
          `Calibration validation error for device ${deviceId}`,
          {
            deviceId,
            sensorType: calibrationRequest.sensor_type,
            userId: user.id,
            executionTime,
            errorType: 'SERVICE_VALIDATION',
            validationError: error.message,
          },
        );
        throw new BadRequestException({
          message: error.message,
          code: 'CALIBRATION_VALIDATION_ERROR',
          deviceId,
          sensorType: calibrationRequest.sensor_type,
        });
      }

      // Handle unexpected errors
      this.logger.error(
        `Unexpected error during calibration for device ${deviceId}`,
        {
          deviceId,
          sensorType: calibrationRequest.sensor_type,
          userId: user.id,
          executionTime,
          errorType: 'UNEXPECTED_ERROR',
          error: error.message,
          stack: error.stack,
        },
      );

      throw new InternalServerErrorException({
        message: 'An unexpected error occurred while processing calibration',
        code: 'INTERNAL_ERROR',
        deviceId,
      });
    }
  }

  /**
   * Get calibration history for a device
   * New endpoint for MQTT device communication feature
   * Implements requirements 1.1, 1.8, 3.1, 3.2, 5.4, 7.4, 8.1, 8.2, 8.4
   */
  @Get('devices/:deviceId/calibrations')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({
    summary: 'Get calibration history for device',
    description:
      'Retrieves the calibration history for the specified device with optional filtering by sensor type.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID in format SMNR-XXXX',
    example: 'SMNR-1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Calibration history retrieved successfully',
    type: [CalibrationResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Device not found or access denied',
    type: ErrorResponseDto,
  })
  async getCalibrationHistory(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Query('sensor_type') sensorType?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<CalibrationResponseDto[]> {
    const startTime = Date.now();

    try {
      this.logger.log(`Calibration history request for device ${deviceId}`, {
        deviceId,
        sensorType,
        userId: user.id,
        page,
        limit,
      });

      const result = await this.calibrationsService.getCalibrationHistory(
        deviceId,
        user,
        parseInt(page),
        parseInt(limit),
        sensorType,
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(`Calibration history retrieved for device ${deviceId}`, {
        deviceId,
        recordCount: Array.isArray(result)
          ? result.length
          : result.calibrations?.length || 0,
        executionTime,
      });

      return Array.isArray(result) ? result : result.calibrations || [];
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Handle device access errors
      if (
        error.message?.includes('not found') ||
        error.message?.includes('access denied')
      ) {
        this.logger.warn(
          `Device access denied for user ${user.id} and device ${deviceId}`,
          {
            deviceId,
            userId: user.id,
            executionTime,
            errorType: 'DEVICE_ACCESS_DENIED',
          },
        );
        throw new ForbiddenException({
          message: `Device ${deviceId} not found or access denied`,
          code: 'DEVICE_ACCESS_DENIED',
          deviceId,
        });
      }

      // Handle unexpected errors
      this.logger.error(
        `Error retrieving calibration history for device ${deviceId}`,
        {
          deviceId,
          userId: user.id,
          executionTime,
          error: error.message,
          stack: error.stack,
        },
      );

      throw new InternalServerErrorException({
        message: 'An error occurred while retrieving calibration history',
        code: 'INTERNAL_ERROR',
        deviceId,
      });
    }
  }

  @Post(':deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @HttpCode(HttpStatus.ACCEPTED)
  async create(
    @Param('deviceId') deviceId: string,
    @Body() createCalibrationDto: CreateCalibrationDto,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.calibrationsService.create(deviceId, createCalibrationDto, user);
    return { message: 'Calibration request sent and is being processed.' };
  }

  @Get(':deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  async findAll(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Query('sensor_type') sensorType?: string,
  ): Promise<CalibrationResponseDto[]> {
    const calibrations = await this.calibrationsService.findAll(
      deviceId,
      user,
      sensorType,
    );
    return calibrations.map((c) => plainToClass(CalibrationResponseDto, c));
  }

  @Delete(':deviceId/:sensorType')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(
    @Param('deviceId') deviceId: string,
    @Param('sensorType') sensorType: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.calibrationsService.clear(deviceId, sensorType, user);
  }

  @Get('status/:deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  async getStatus(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    return this.calibrationsService.getStatus(deviceId, user);
  }

  @Put(':id/apply')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  async apply(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CalibrationResponseDto> {
    const calibration = await this.calibrationsService.apply(id, user);
    return plainToClass(CalibrationResponseDto, calibration);
  }
}
