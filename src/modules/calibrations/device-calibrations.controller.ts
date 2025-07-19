import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CalibrationsService } from './calibrations.service';
import { CalibrationRequestDto } from './dto/calibration-request.dto';
import { CalibrationResponseDto } from './dto/calibration-response.dto';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { RolesGuard } from '@/core/auth/guards/roles-guard';

@ApiTags('Device Calibrations')
@ApiBearerAuth('JWT-auth')
@Controller('devices/:deviceId/calibrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class DeviceCalibrationsController {
  constructor(private readonly calibrationsService: CalibrationsService) {}

  /**
   * Send calibration data to device via MQTT
   * POST /devices/:deviceId/calibrations
   * Implements requirements 1.1, 1.8, 3.1, 3.2, 5.4, 7.4, 8.1, 8.2, 8.4
   */
  @Post()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send calibration data to device via MQTT',
    description: `
      Sends calibration data to the specified device using MQTT protocol and stores the calibration record in the database.
      
      **Supported Sensor Types:**
      - **pH**: Requires 2-3 calibration points (typically pH 4, 7, 10)
      - **TDS**: Requires 1-2 calibration points (0 and standard solution)
      - **DO**: Requires 2 calibration points (zero and air-saturated)
      
      **Process Flow:**
      1. Validates device access and calibration data
      2. Publishes calibration command to MQTT topic: \`simonair/{deviceId}/calibration\`
      3. Stores calibration record in database
      4. Returns calibration details with pending acknowledgment status
      
      **MQTT Message Format:**
      \`\`\`json
      {
        "sensor_type": "ph",
        "calibration_points": [...],
        "timestamp": "2024-01-15T10:30:00Z"
      }
      \`\`\`
    `,
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID in SMNR-XXXX format. Must be owned by the authenticated user.',
    example: 'SMNR-0001',
    schema: {
      type: 'string',
      pattern: '^SMNR-[0-9]{4}$'
    }
  })
  @ApiBody({
    type: CalibrationRequestDto,
    description: 'Calibration data including sensor type and calibration points',
    examples: {
      phCalibration: {
        summary: 'pH Sensor 3-Point Calibration',
        description: 'Standard 3-point pH calibration using buffer solutions',
        value: {
          sensor_type: 'ph',
          calibration_points: [
            { standard_value: '4.00', measured_value: '4.02', temperature: '25.0' },
            { standard_value: '7.00', measured_value: '7.01', temperature: '25.0' },
            { standard_value: '10.00', measured_value: '9.98', temperature: '25.0' }
          ],
          calibration_date: '2024-01-15T10:30:00Z',
          notes: 'Monthly calibration using fresh buffer solutions'
        }
      },
      tdsCalibration: {
        summary: 'TDS Sensor 2-Point Calibration',
        description: 'TDS calibration using distilled water and standard solution',
        value: {
          sensor_type: 'tds',
          calibration_points: [
            { standard_value: '0', measured_value: '2', temperature: '25.0' },
            { standard_value: '1413', measured_value: '1410', temperature: '25.0' }
          ],
          calibration_date: '2024-01-15T10:30:00Z',
          notes: 'Using 1413 µS/cm standard conductivity solution'
        }
      },
      doCalibration: {
        summary: 'DO Sensor 2-Point Calibration',
        description: 'Dissolved oxygen calibration with zero and span points',
        value: {
          sensor_type: 'do',
          calibration_points: [
            { standard_value: '0.00', measured_value: '0.02', temperature: '25.0' },
            { standard_value: '8.26', measured_value: '8.24', temperature: '25.0' }
          ],
          calibration_date: '2024-01-15T10:30:00Z',
          notes: 'Zero in sodium sulfite, span in air-saturated water'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Calibration sent successfully and stored in database',
    type: CalibrationResponseDto,
    examples: {
      success: {
        summary: 'Successful Calibration Response',
        value: {
          status: 'success',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            device_id: 'SMNR-0001',
            sensor_type: 'ph',
            calibration_points: [
              { standard_value: '4.00', measured_value: '4.02', temperature: '25.0' },
              { standard_value: '7.00', measured_value: '7.01', temperature: '25.0' },
              { standard_value: '10.00', measured_value: '9.98', temperature: '25.0' }
            ],
            calibration_date: '2024-01-15T10:30:00Z',
            applied_at: '2024-01-15T10:30:00Z',
            created_by: 'user-uuid-123',
            mqtt_published: true,
            ack_status: 'pending'
          },
          metadata: {
            timestamp: '2024-01-15T10:30:00.123Z',
            path: '/devices/SMNR-0001/calibrations',
            executionTime: 145,
            requestId: 'req-123e4567-e89b-12d3-a456-426614174000'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid calibration data or device ID format',
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
                  field: { type: 'string', example: 'sensor_type' },
                  message: { type: 'string', example: 'Invalid sensor type' },
                  value: { type: 'string', example: 'invalid_sensor' }
                }
              }
            }
          }
        },
        metadata: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2024-01-15T10:30:00.123Z' },
            path: { type: 'string', example: '/devices/SMNR-0001/calibrations' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Device not found or not owned by user',
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
              example: ['Device SMNR-0001 not found or you do not have access']
            },
            deviceId: { type: 'string', example: 'SMNR-0001' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'MQTT broker unavailable - calibration data stored but not sent to device',
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
              example: ['Calibration stored but could not be sent to device. Device will receive it when connection is restored.']
            },
            context: {
              type: 'object',
              properties: {
                brokerUrl: { type: 'string', example: 'mqtt://localhost:1883' },
                reconnectAttempts: { type: 'number', example: 3 }
              }
            }
          }
        }
      }
    }
  })
  async sendCalibration(
    @Param('deviceId') deviceId: string,
    @Body() calibrationRequest: CalibrationRequestDto,
    @CurrentUser() user: User,
  ): Promise<CalibrationResponseDto> {
    return await this.calibrationsService.sendCalibration(
      deviceId,
      calibrationRequest,
      user,
    );
  }

  /**
   * Get calibration history for device
   * GET /devices/:deviceId/calibrations
   * Implements requirements 5.4, 8.1, 8.2, 8.4
   */
  @Get()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({
    summary: 'Get calibration history for device',
    description:
      'Retrieves paginated calibration history for the specified device.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID in SMNR-XXXX format',
    example: 'SMNR-0001',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sensor_type',
    required: false,
    description: 'Filter by sensor type (ph, tds, do)',
    example: 'ph',
  })
  @ApiResponse({
    status: 200,
    description: 'Calibration history retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Device not found or not owned by user',
  })
  async getCalibrationHistory(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('sensor_type') sensorType?: string,
  ): Promise<{
    calibrations: CalibrationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return await this.calibrationsService.getCalibrationHistory(
      deviceId,
      user,
      page,
      limit,
      sensorType,
    );
  }
}
