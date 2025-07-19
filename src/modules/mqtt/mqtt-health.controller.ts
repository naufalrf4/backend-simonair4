import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles-guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MqttService } from './mqtt.service';

export class MqttHealthResponseDto {
  @ApiProperty({
    description: 'Overall MQTT service health status',
    example: 'healthy',
    enum: ['healthy', 'unhealthy', 'reconnecting', 'failed'],
  })
  status: 'healthy' | 'unhealthy' | 'reconnecting' | 'failed';

  @ApiProperty({
    description: 'Whether MQTT broker is currently connected',
    example: true,
  })
  isConnected: boolean;

  @ApiProperty({
    description: 'Detailed connection information',
  })
  details: {
    clientInitialized: boolean;
    brokerConnected: boolean;
    lastConnectionTime?: Date;
    reconnectAttempts: number;
    lastError?: string;
    uptime?: number;
  };

  @ApiProperty({
    description: 'Health check timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Service version or build info',
    example: '1.0.0',
    required: false,
  })
  version?: string;
}

@ApiTags('MQTT Health')
@Controller('mqtt/health')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MqttHealthController {
  constructor(private readonly mqttService: MqttService) {}

  @Get()
  @ApiOperation({
    summary: 'Check MQTT broker connection health',
    description:
      'Returns detailed health status of MQTT broker connection including connection state, uptime, and error information',
  })
  @ApiResponse({
    status: 200,
    description: 'MQTT health status retrieved successfully',
    type: MqttHealthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERUSER)
  async getHealthStatus(): Promise<MqttHealthResponseDto> {
    const healthStatus = await this.mqttService.validateMqttConnection();

    return {
      status: healthStatus.status,
      isConnected: healthStatus.isConnected,
      details: healthStatus.details,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Get detailed MQTT service diagnostics',
    description:
      'Returns comprehensive diagnostic information about MQTT service including connection metrics, message statistics, and performance data',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed MQTT diagnostics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERUSER)
  async getDetailedDiagnostics(): Promise<{
    health: MqttHealthResponseDto;
    metrics: {
      totalPublishAttempts: number;
      successfulPublishes: number;
      failedPublishes: number;
      averagePublishLatency: number;
      activeSubscriptions: string[];
      messageDeliveryTracking: Record<string, any>;
    };
    configuration: {
      brokerUrl: string;
      topicPrefix: string;
      reconnectEnabled: boolean;
      maxRetries: number;
    };
  }> {
    const healthStatus = await this.getHealthStatus();
    const diagnostics = await this.mqttService.getDiagnostics();

    return {
      health: healthStatus,
      metrics: diagnostics.metrics,
      configuration: diagnostics.configuration,
    };
  }
}
