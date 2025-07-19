import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
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
import { ThresholdsService } from './thresholds.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/guards/roles-guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { ThresholdRequestDto } from './dto/threshold-request.dto';
import { ThresholdResponseDto } from './dto/threshold-response.dto';
import { ThresholdConfigResponseDto } from './dto/threshold-config-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  MqttBrokerUnavailableException,
  MqttPublishFailedException,
  InvalidDeviceIdFormatException,
  MqttPayloadValidationException,
} from '../mqtt/exceptions/mqtt.exceptions';
import { ErrorResponseDto } from '@/core/common/dto/error-response.dto';

@ApiTags('Device Thresholds')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class ThresholdsController {
  private readonly logger = new Logger(ThresholdsController.name);

  constructor(private readonly thresholdsService: ThresholdsService) {}

  /**
   * Send threshold configuration to device via MQTT
   * New endpoint for MQTT device communication feature
   * Implements requirements 2.1, 2.7, 2.8, 3.1, 3.2, 6.4, 7.4, 8.1, 8.2, 8.4
   */
  @Post('devices/:deviceId/thresholds')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send threshold configuration to device via MQTT',
    description: `
      Sends threshold configuration to the specified device using MQTT protocol to set water quality alert limits.
      
      **Supported Parameters:**
      - **pH**: Range 0-14 (typical aquaculture: 6.5-8.5)
      - **TDS**: Range 0-2000 ppm (typical aquaculture: 200-800 ppm)
      - **DO**: Range 0-20 mg/L (typical aquaculture: 5-12 mg/L)
      - **Temperature**: Range -10-50°C (typical aquaculture: 20-30°C)
      
      **Process Flow:**
      1. Validates device access and threshold values
      2. Publishes threshold configuration to MQTT topic: \`simonair/{deviceId}/threshold\`
      3. Stores configuration in database
      4. Device acknowledges receipt and applies new thresholds
      
      **MQTT Message Format:**
      \`\`\`json
      {
        "ph_min": "7.5", "ph_max": "8.5",
        "tds_min": "300", "tds_max": "500",
        "do_min": "5.0", "do_max": "12.0",
        "temp_min": "26.0", "temp_max": "30.0",
        "timestamp": "2024-01-15T10:30:00Z"
      }
      \`\`\`
      
      **Partial Updates:** You can update only specific thresholds by including only the desired parameters.
    `,
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID in SMNR-XXXX format. Must be owned by the authenticated user.',
    example: 'SMNR-1234',
    schema: {
      type: 'string',
      pattern: '^SMNR-[0-9]{4}$'
    }
  })
  @ApiBody({
    type: ThresholdRequestDto,
    description: 'Threshold configuration values. All fields are optional for partial updates.',
    examples: {
      shrimpFarming: {
        summary: 'Shrimp Farming Thresholds',
        description: 'Optimal thresholds for marine shrimp aquaculture',
        value: {
          ph_min: '7.5',
          ph_max: '8.5',
          tds_min: '300',
          tds_max: '500',
          do_min: '5.0',
          do_max: '12.0',
          temp_min: '26.0',
          temp_max: '30.0'
        }
      },
      fishFarming: {
        summary: 'Fish Farming Thresholds',
        description: 'Optimal thresholds for freshwater fish farming',
        value: {
          ph_min: '6.5',
          ph_max: '8.0',
          tds_min: '200',
          tds_max: '400',
          do_min: '6.0',
          do_max: '15.0',
          temp_min: '22.0',
          temp_max: '28.0'
        }
      },
      partialUpdate: {
        summary: 'Partial Threshold Update',
        description: 'Update only pH and temperature thresholds',
        value: {
          ph_min: '7.0',
          ph_max: '8.2',
          temp_min: '24.0',
          temp_max: '29.0'
        }
      },
      emergencyAdjustment: {
        summary: 'Emergency Threshold Adjustment',
        description: 'Widen thresholds during adverse weather conditions',
        value: {
          temp_min: '20.0',
          temp_max: '32.0',
          do_min: '4.0'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Threshold configuration sent successfully',
    type: ThresholdResponseDto,
    examples: {
      success: {
        summary: 'Successful Threshold Configuration',
        value: {
          status: 'success',
          data: {
            id: '456e7890-e89b-12d3-a456-426614174000',
            device_id: 'SMNR-1234',
            threshold_data: {
              ph_min: '7.5',
              ph_max: '8.5',
              tds_min: '300',
              tds_max: '500',
              do_min: '5.0',
              do_max: '12.0',
              temp_min: '26.0',
              temp_max: '30.0'
            },
            updated_at: '2024-01-15T10:30:00Z',
            updated_by: 'user-uuid-123',
            ack_status: 'pending',
            ack_received_at: null,
            mqtt_published: true
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00.123Z',
            path: '/devices/SMNR-1234/thresholds',
            executionTime: 98,
            requestId: 'req-456e7890-e89b-12d3-a456-426614174000'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid threshold data or device ID format',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'ph_min' },
                  message: { type: 'string', example: 'pH minimum must be less than pH maximum' },
                  value: { type: 'string', example: '8.5' },
                  constraint: { type: 'string', example: 'isLessThan' }
                }
              },
              example: [
                {
                  field: 'ph_min',
                  message: 'pH minimum must be less than pH maximum',
                  value: '8.5',
                  constraint: 'isLessThan'
                },
                {
                  field: 'tds_max',
                  message: 'TDS value must be between 0 and 2000 ppm',
                  value: '2500',
                  constraint: 'isValidThresholdRange'
                }
              ]
            },
            deviceId: { type: 'string', example: 'SMNR-1234' },
            type: { type: 'string', example: 'VALIDATION_ERROR' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Device not found or access denied',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 403 },
            message: { type: 'string', example: 'Device not found or access denied' },
            details: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['Device SMNR-1234 not found or you do not have access to this device']
            },
            deviceId: { type: 'string', example: 'SMNR-1234' },
            type: { type: 'string', example: 'DEVICE_ACCESS_ERROR' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'MQTT broker unavailable',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 503 },
            message: { type: 'string', example: 'MQTT broker unavailable' },
            details: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['Unable to publish threshold configuration to MQTT broker. Configuration saved and will be sent when connection is restored.']
            },
            deviceId: { type: 'string', example: 'SMNR-1234' },
            type: { type: 'string', example: 'MQTT_SERVICE_ERROR' },
            context: {
              type: 'object',
              properties: {
                brokerUrl: { type: 'string', example: 'mqtt://localhost:1883' },
                lastConnectionAttempt: { type: 'string', example: '2024-01-15T10:29:45Z' },
                reconnectAttempts: { type: 'number', example: 3 }
              }
            }
          }
        }
      }
    }
  })
  async sendThresholds(
    @Param('deviceId') deviceId: string,
    @Body() thresholdRequest: ThresholdRequestDto,
    @CurrentUser() user: User,
  ): Promise<ThresholdResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Threshold configuration request received for device ${deviceId}`,
        {
          deviceId,
          userId: user.id,
          userEmail: user.email,
          thresholdFields: Object.keys(thresholdRequest).filter(
            (key) => thresholdRequest[key] !== undefined,
          ),
        },
      );

      // Call service with comprehensive error handling
      const result = await this.thresholdsService.sendThresholds(
        deviceId,
        thresholdRequest,
        user,
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Threshold configuration sent successfully for device ${deviceId}`,
        {
          deviceId,
          executionTime,
          thresholdId: result.id,
          configuredFields: Object.keys(thresholdRequest).filter(
            (key) => thresholdRequest[key] !== undefined,
          ),
        },
      );

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
          `Threshold payload validation failed for device ${deviceId}`,
          {
            deviceId,
            userId: user.id,
            executionTime,
            errorType: 'PAYLOAD_VALIDATION',
            validationError: error.message,
            providedFields: Object.keys(thresholdRequest).filter(
              (key) => thresholdRequest[key] !== undefined,
            ),
          },
        );
        throw new BadRequestException({
          message: error.message,
          code: 'THRESHOLD_VALIDATION_FAILED',
          deviceId,
          providedFields: Object.keys(thresholdRequest).filter(
            (key) => thresholdRequest[key] !== undefined,
          ),
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
          `Failed to publish thresholds for device ${deviceId}`,
          {
            deviceId,
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
        this.logger.warn(`Threshold validation error for device ${deviceId}`, {
          deviceId,
          userId: user.id,
          executionTime,
          errorType: 'SERVICE_VALIDATION',
          validationError: error.message,
        });
        throw new BadRequestException({
          message: error.message,
          code: 'THRESHOLD_VALIDATION_ERROR',
          deviceId,
        });
      }

      // Handle unexpected errors
      this.logger.error(
        `Unexpected error during threshold configuration for device ${deviceId}`,
        {
          deviceId,
          userId: user.id,
          executionTime,
          errorType: 'UNEXPECTED_ERROR',
          error: error.message,
          stack: error.stack,
        },
      );

      throw new InternalServerErrorException({
        message:
          'An unexpected error occurred while processing threshold configuration',
        code: 'INTERNAL_ERROR',
        deviceId,
      });
    }
  }

  /**
   * Get current threshold configuration for a device
   * New endpoint for MQTT device communication feature
   * Implements requirements 2.1, 2.7, 2.8, 3.1, 3.2, 6.4, 7.4, 8.1, 8.2, 8.4
   */
  @Get('devices/:deviceId/thresholds')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({
    summary: 'Get current threshold configuration for device',
    description:
      'Retrieves the current threshold configuration for the specified device.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID in format SMNR-XXXX',
    example: 'SMNR-1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Current threshold configuration retrieved successfully',
    type: ThresholdConfigResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Device not found or access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'No threshold configuration found for device',
  })
  async getCurrentThresholds(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ): Promise<ThresholdConfigResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Threshold configuration retrieval request for device ${deviceId}`,
        {
          deviceId,
          userId: user.id,
        },
      );

      const result = await this.thresholdsService.getCurrentThresholds(
        deviceId,
        user,
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Threshold configuration retrieved for device ${deviceId}`,
        {
          deviceId,
          executionTime,
          hasConfiguration: !!result,
        },
      );

      return result;
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

      // Handle not found errors
      if (error.message?.includes('No threshold configuration')) {
        this.logger.log(
          `No threshold configuration found for device ${deviceId}`,
          {
            deviceId,
            userId: user.id,
            executionTime,
            errorType: 'THRESHOLD_NOT_FOUND',
          },
        );
        throw new NotFoundException({
          message: `No threshold configuration found for device ${deviceId}`,
          code: 'THRESHOLD_CONFIG_NOT_FOUND',
          deviceId,
        });
      }

      // Handle unexpected errors
      this.logger.error(
        `Error retrieving threshold configuration for device ${deviceId}`,
        {
          deviceId,
          userId: user.id,
          executionTime,
          error: error.message,
          stack: error.stack,
        },
      );

      throw new InternalServerErrorException({
        message: 'An error occurred while retrieving threshold configuration',
        code: 'INTERNAL_ERROR',
        deviceId,
      });
    }
  }

  // Legacy endpoints for backward compatibility
  @Get('devices/:deviceId/thresholds/legacy')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Get thresholds for a device (legacy)' })
  @ApiResponse({
    status: 200,
    description: 'Thresholds retrieved successfully.',
    type: ThresholdResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device or thresholds not found.' })
  async getThreshold(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ): Promise<ThresholdResponseDto> {
    const threshold = await this.thresholdsService.getThreshold(deviceId, user);
    return new ThresholdResponseDto({
      id: threshold.id,
      device_id: threshold.deviceId,
      threshold_data: threshold.thresholdData,
      updated_at: threshold.updatedAt,
      updated_by: threshold.updatedBy,
      ack_status: threshold.ackStatus,
      ack_received_at: threshold.ackReceivedAt,
      mqtt_published: true,
    });
  }

  @Put('devices/:deviceId/thresholds/legacy')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Update thresholds for a device (legacy)' })
  @ApiResponse({
    status: 200,
    description: 'Thresholds updated successfully.',
    type: ThresholdResponseDto,
  })
  async updateThreshold(
    @Param('deviceId') deviceId: string,
    @Body() updateThresholdDto: UpdateThresholdDto,
    @CurrentUser() user: User,
  ): Promise<ThresholdResponseDto> {
    const threshold = await this.thresholdsService.updateThreshold(
      deviceId,
      updateThresholdDto,
      user,
    );
    return new ThresholdResponseDto({
      id: threshold.id,
      device_id: threshold.deviceId,
      threshold_data: threshold.thresholdData,
      updated_at: threshold.updatedAt,
      updated_by: threshold.updatedBy,
      ack_status: threshold.ackStatus,
      ack_received_at: threshold.ackReceivedAt,
      mqtt_published: true,
    });
  }
}
