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
} from '@nestjs/swagger';
import { CreateDeviceResponseDto } from './dto/create-device-response.dto';
import { DevicesListResponseDto } from './dto/devices-list-response.dto';
import { DeviceDetailResponseDto } from './dto/device-detail-response.dto';
import { UpdateDeviceResponseDto } from './dto/update-device-response.dto';
import { DeleteDeviceResponseDto } from './dto/delete-device-response.dto';
import { DeviceErrorResponseDto } from './dto/error-response.dto';

@ApiTags('Devices')
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor, CacheInterceptor)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

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
  ): Promise<DeviceResponseDto> {
    const device = await this.devicesService.create(createDeviceDto, user);
    return plainToClass(DeviceResponseDto, device);
  }

  @Get()
  @Roles(UserRole.SUPERUSER, UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'Get all devices',
    description:
      'Retrieves all devices accessible to the current user with latest sensor data',
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
  ): Promise<DeviceResponseDto> {
    const device = await this.devicesService.findOne(id, user);
    return plainToClass(DeviceResponseDto, device);
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
  ): Promise<DeviceResponseDto> {
    const device = await this.devicesService.update(id, updateDeviceDto, user);
    return plainToClass(DeviceResponseDto, device);
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
  ): Promise<void> {
    return this.devicesService.remove(id, user);
  }
}
