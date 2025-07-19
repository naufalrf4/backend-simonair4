import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from '@/modules/devices/dto/create-device.dto';
import { UpdateDeviceDto } from '@/modules/devices/dto/update-device.dto';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/guards/roles-guard';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { DeviceResponseDto } from '@/modules/devices/dto/device-response.dto';
import { plainToClass } from 'class-transformer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateDeviceResponseDto } from './dto/create-device-response.dto';
import { DevicesListResponseDto } from './dto/devices-list-response.dto';
import { DeviceDetailResponseDto } from './dto/device-detail-response.dto';
import { UpdateDeviceResponseDto } from './dto/update-device-response.dto';
import { DeleteDeviceResponseDto } from './dto/delete-device-response.dto';
import { DeviceErrorResponseDto } from './dto/error-response.dto';
import { CalibrationsService } from '@/modules/calibrations/calibrations.service';
import { CalibrationRequestDto } from '@/modules/calibrations/dto/calibration-request.dto';
import { CalibrationResponseDto } from '@/modules/calibrations/dto/calibration-response.dto';

@ApiTags('Devices')
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor, CacheInterceptor)
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly calibrationsService: CalibrationsService,
  ) {}

  @Post()
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Create new device',
    description: 'Creates a new IoT device linked to the current user',
  })
  @ApiBody({
    type: CreateDeviceDto,
    description: 'Device creation data',
    examples: {
      validExample: {
        summary: 'Valid Device Creation Example',
        value: {
          device_id: 'SMNR-0001',
          device_name: 'Living Room Aquarium',
          location: 'Living Room',
          aquarium_size: '50x30x30 cm',
          glass_type: 'Tempered Glass',
          fish_count: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Device created successfully',
    type: CreateDeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid input)',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Device ID already exists',
    type: DeviceErrorResponseDto,
  })
  async create(
    @Body() createDeviceDto: CreateDeviceDto,
    @CurrentUser() user: User,
  ): Promise<CreateDeviceResponseDto> {
    const device = await this.devicesService.create(createDeviceDto, user);
    const deviceResponse = plainToClass(DeviceResponseDto, device);

    return {
      status: 'success',
      data: deviceResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        path: '/devices',
        executionTime: 0, // This would be calculated by a timing interceptor
      },
    };
  }

  @Get()
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get all devices',
    description:
      'Retrieves all devices accessible to the current user with latest sensor data and pagination support',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter devices by name or ID',
    example: 'Living Room',
  })
  @ApiResponse({
    status: 200,
    description: 'List of devices retrieved successfully',
    type: DevicesListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: DeviceErrorResponseDto,
  })
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ): Promise<DevicesListResponseDto> {
    const { devices, total } = await this.devicesService.getDevices({
      user,
      page,
      limit,
      search,
    });

    return {
      status: 'success',
      data: devices,
      metadata: { total, page, limit },
    };
  }

  @Get(':id')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get device by ID',
    description: 'Retrieves a single device by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Device ID (format: SMNR-XXXX)',
    example: 'SMNR-0001',
  })
  @ApiResponse({
    status: 200,
    description: 'Device found',
    type: DeviceDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have access to this device',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
    type: DeviceErrorResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<DeviceDetailResponseDto> {
    const device = await this.devicesService.findOne(id, user);
    const deviceResponse = plainToClass(DeviceResponseDto, device);

    return {
      status: 'success',
      data: deviceResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        path: `/devices/${id}`,
        executionTime: 0, // This would be calculated by a timing interceptor
      },
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Update device',
    description: "Updates a device's information",
  })
  @ApiParam({
    name: 'id',
    description: 'Device ID (format: SMNR-XXXX)',
    example: 'SMNR-0001',
  })
  @ApiBody({
    type: UpdateDeviceDto,
    description: 'Device update data',
    examples: {
      validExample: {
        summary: 'Valid Device Update Example',
        value: {
          device_name: 'Updated Aquarium Name',
          location: 'Bedroom',
          fish_count: 15,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Device updated successfully',
    type: UpdateDeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid input)',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have access to this device',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
    type: DeviceErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
    @CurrentUser() user: User,
  ): Promise<UpdateDeviceResponseDto> {
    const device = await this.devicesService.update(id, updateDeviceDto, user);
    const deviceResponse = plainToClass(DeviceResponseDto, device);

    return {
      status: 'success',
      data: deviceResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        path: `/devices/${id}`,
        executionTime: 0, // This would be calculated by a timing interceptor
      },
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Delete device', description: 'Removes a device' })
  @ApiParam({
    name: 'id',
    description: 'Device ID (format: SMNR-XXXX)',
    example: 'SMNR-0001',
  })
  @ApiResponse({
    status: 200,
    description: 'Device deleted successfully',
    type: DeleteDeviceResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have access to this device',
    type: DeviceErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
    type: DeviceErrorResponseDto,
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<DeleteDeviceResponseDto> {
    await this.devicesService.remove(id, user);

    return {
      status: 'success',
      data: {
        message: 'Device deleted successfully',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        path: `/devices/${id}`,
        executionTime: 0, // This would be calculated by a timing interceptor
      },
    };
  }

  /**
   * Send calibration data to device via MQTT
   * Implements requirements 1.1, 1.8, 3.1, 3.2, 5.4, 7.4, 8.1, 8.2, 8.4
   */
  @Post(':deviceId/calibrations')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
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
  @ApiBody({
    type: CalibrationRequestDto,
    description: 'Calibration data for the specified sensor type',
    examples: {
      phCalibration: {
        summary: 'pH Sensor Calibration',
        value: {
          sensor_type: 'ph',
          calibration_data: {
            m: -7.153,
            c: 22.456,
          },
        },
      },
      tdsCalibration: {
        summary: 'TDS Sensor Calibration',
        value: {
          sensor_type: 'tds',
          calibration_data: {
            v: 1.42,
            std: 442,
            t: 25.0,
          },
        },
      },
      doCalibration: {
        summary: 'DO Sensor Calibration',
        value: {
          sensor_type: 'do',
          calibration_data: {
            ref: 8.0,
            v: 1.171,
            t: 25.0,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Calibration data sent successfully',
    type: CalibrationResponseDto,
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
                  message: {
                    type: 'string',
                    example: 'Invalid sensor type for MQTT calibration',
                  },
                  value: { type: 'string', example: 'invalid_sensor' },
                },
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2025-01-18T10:30:00.000Z' },
            path: {
              type: 'string',
              example: '/devices/SMNR-1234/calibrations',
            },
          },
        },
      },
    },
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
            message: {
              type: 'string',
              example: 'You are not authorized to access device "SMNR-1234"',
            },
          },
        },
      },
    },
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
          },
        },
      },
    },
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
   * Get calibration history for a device
   * Implements requirements 1.1, 1.8, 3.1, 3.2, 5.4, 7.4, 8.1, 8.2, 8.4
   */
  @Get(':deviceId/calibrations')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({
    summary: 'Get calibration history for device',
    description:
      'Retrieves paginated calibration history for the specified device with optional sensor type filtering.',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID in format SMNR-XXXX',
    example: 'SMNR-1234',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of records per page',
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'sensor_type',
    description: 'Filter by sensor type (ph, tds, do)',
    example: 'ph',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Calibration history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            calibrations: {
              type: 'array',
              items: { $ref: '#/components/schemas/CalibrationResponseDto' },
            },
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2025-01-18T10:30:00.000Z' },
            path: {
              type: 'string',
              example: '/devices/SMNR-1234/calibrations',
            },
          },
        },
      },
    },
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
            message: {
              type: 'string',
              example: 'You are not authorized to access device "SMNR-1234"',
            },
          },
        },
      },
    },
  })
  async getCalibrationHistory(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sensor_type') sensorType?: string,
  ): Promise<{
    status: string;
    data: {
      calibrations: CalibrationResponseDto[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    metadata: {
      timestamp: string;
      path: string;
      executionTime?: number;
    };
  }> {
    const result = await this.calibrationsService.getCalibrationHistory(
      deviceId,
      user,
      page,
      limit,
      sensorType,
    );

    return {
      status: 'success',
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        path: `/devices/${deviceId}/calibrations`,
        executionTime: 0, // This would be calculated by a timing interceptor
      },
    };
  }
}
