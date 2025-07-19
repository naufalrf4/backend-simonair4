import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { CalibrationRepository } from './calibration.repository';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { CalibrationRequestDto } from './dto/calibration-request.dto';
import { CalibrationResponseDto } from './dto/calibration-response.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Calibration } from './entities/calibration.entity';
import { DevicesService } from '../devices/devices.service';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CalibrationsService {
  private readonly logger = new Logger(CalibrationsService.name);
  private readonly VALID_SENSORS = ['ph', 'tds', 'do', 'temperature'];
  private readonly MQTT_VALID_SENSORS = ['ph', 'tds', 'do']; // Only these sensors are supported for MQTT calibration

  constructor(
    private readonly calibrationRepository: CalibrationRepository,
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService: MqttService,
  ) {}

  async create(
    deviceId: string,
    createCalibrationDto: CreateCalibrationDto,
    user: User,
  ): Promise<void> {
    const { sensor_type, calibration_data } = createCalibrationDto;
    await this.validateDeviceAccess(deviceId, user);
    this.validateSensorType(sensor_type);

    // 5. Validation (CalibrationService) - Enhanced validation for different sensor types
    this.validateCalibrationDataBySensorType(sensor_type, calibration_data);

    // 6. Store (CalibrationRepository)
    const calibration = this.calibrationRepository.create({
      device_id: deviceId,
      sensor_type,
      calibration_data,
    });
    calibration.applied_by = user.id;
    await this.calibrationRepository.save(calibration);

    // 7. Publish MQTT - Use the enhanced calibration publishing with proper formatting
    const calibrationRequest = { sensor_type, calibration_data };
    await this.mqttService.publishCalibrationWithValidation(deviceId, calibrationRequest);

    this.logger.log(`Calibration created and published for device ${deviceId}, sensor: ${sensor_type}`);
  }

  async findAll(
    deviceId: string,
    user?: User,
    sensorType?: string,
  ): Promise<Calibration[]> {
    await this.validateDeviceAccess(deviceId, user);
    return this.calibrationRepository.findByDeviceId(deviceId, sensorType);
  }

  async clear(deviceId: string, sensorType: string, user: User): Promise<void> {
    await this.validateDeviceAccess(deviceId, user);
    this.validateSensorType(sensorType);

    await this.calibrationRepository.clearBySensorType(deviceId, sensorType);

    // Send clear calibration command to IoT device
    const clearPayload = {
      [sensorType]: {
        clear: true
      }
    };
    
    const topic = `simonair/${deviceId}/calibrate`;
    const payload = JSON.stringify(clearPayload);
    await this.mqttService.publishWithRetry(topic, payload, { qos: 1 });

    this.logger.log(`Calibration cleared for device ${deviceId}, sensor: ${sensorType}`);
  }

  async getStatus(deviceId: string, user: User): Promise<any> {
    await this.validateDeviceAccess(deviceId, user);
    const statuses = await Promise.all(
      this.VALID_SENSORS.map(async (sensor) => {
        const latest =
          await this.calibrationRepository.getLatestByDeviceAndSensor(
            deviceId,
            sensor,
          );
        return {
          sensor,
          latest_calibration: latest,
          is_calibrated: !!latest,
        };
      }),
    );
    return statuses;
  }

  async apply(id: string, user: User): Promise<Calibration> {
    const calibration = await this.calibrationRepository.findOne({
      where: { id },
    });
    if (!calibration) {
      throw new NotFoundException('Calibration not found');
    }
    await this.validateDeviceAccess(calibration.device_id, user);

    const updatedCalibration = await this.calibrationRepository.update(id, {
      applied_at: new Date(),
      applied_by: user.id,
    });

    const topic = `simonair/${calibration.device_id}/calibrate`;
    const payload = JSON.stringify(updatedCalibration.calibration_data);
    this.mqttService.publishWithRetry(topic, payload, { qos: 1 });

    return updatedCalibration;
  }

  /**
   * Send calibration data to device via MQTT with database persistence and MQTT tracking
   * Implements requirements 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async sendCalibration(
    deviceId: string,
    calibrationRequest: CalibrationRequestDto,
    user: User,
  ): Promise<CalibrationResponseDto> {
    try {
      this.logger.log(
        `Sending calibration for device ${deviceId}, sensor: ${calibrationRequest.sensor_type}, user: ${user.id}`,
      );

      await this.validateDeviceOwnership(deviceId, user);

      this.validateMqttSensorType(calibrationRequest.sensor_type);

      this.validateCalibrationDataBySensorType(
        calibrationRequest.sensor_type,
        calibrationRequest.calibration_data,
      );
      const calibration = this.calibrationRepository.create({
        device_id: deviceId,
        sensor_type: calibrationRequest.sensor_type,
        calibration_data: calibrationRequest.calibration_data,
        applied_by: user.id,
        applied_at: new Date(),
        mqtt_ack_status: 'pending',
        mqtt_retry_count: 0,
      });

      const savedCalibration =
        await this.calibrationRepository.save(calibration);
      this.logger.log(
        `Calibration record saved with ID: ${savedCalibration.id}`,
      );

      try {
        savedCalibration.mqtt_published_at = new Date();
        await this.calibrationRepository.save(savedCalibration);

        await this.mqttService.publishCalibrationWithValidation(
          deviceId,
          calibrationRequest,
        );

        this.logger.log(
          `Calibration successfully published to MQTT for device ${deviceId}, sensor: ${calibrationRequest.sensor_type}`,
        );
      } catch (mqttError) {
        savedCalibration.mqtt_ack_status = 'failed';
        savedCalibration.mqtt_retry_count += 1;
        await this.calibrationRepository.save(savedCalibration);

        this.logger.error(
          `MQTT publish failed for calibration ${savedCalibration.id}: ${mqttError.message}`,
          mqttError.stack,
        );
      }

      // Convert to response DTO (Requirement 5.3)
      return plainToClass(CalibrationResponseDto, savedCalibration, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send calibration for device ${deviceId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get calibration history for a device with pagination
   * Implements requirements 5.3, 5.4
   */
  async getCalibrationHistory(
    deviceId: string,
    user: User,
    page: number = 1,
    limit: number = 10,
    sensorType?: string,
  ): Promise<{
    calibrations: CalibrationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      this.logger.log(
        `Getting calibration history for device ${deviceId}, user: ${user.id}, page: ${page}, limit: ${limit}`,
      );

      // Validate device ownership and access (Requirement 5.4)
      await this.validateDeviceOwnership(deviceId, user);

      // Get paginated calibration history (Requirement 5.3)
      const { calibrations, total } =
        await this.calibrationRepository.findByDeviceIdWithPagination(
          deviceId,
          page,
          limit,
          sensorType,
        );

      // Convert to response DTOs
      const calibrationDtos = calibrations.map((calibration) =>
        plainToClass(CalibrationResponseDto, calibration, {
          excludeExtraneousValues: true,
        }),
      );

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Retrieved ${calibrations.length} calibrations out of ${total} total for device ${deviceId}`,
      );

      return {
        calibrations: calibrationDtos,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get calibration history for device ${deviceId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async validateDeviceAccess(
    deviceId: string,
    user?: User,
  ): Promise<void> {
    if (!user) {
      // Internal access, no user validation needed
      return;
    }
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return;
    }
    const device = await this.devicesService.findOne(deviceId, user);
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    if (device.user_id !== user.id) {
      throw new UnauthorizedException();
    }
  }

  /**
   * Validate device ownership with enhanced error handling
   * Implements requirement 5.4
   */
  private async validateDeviceOwnership(
    deviceId: string,
    user: User,
  ): Promise<void> {
    try {
      // Admin and superuser can access all devices
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
        // Still validate that device exists
        await this.devicesService.validateDevice(deviceId);
        return;
      }

      // For regular users, validate ownership
      const device = await this.devicesService.findOne(deviceId, user);
      if (!device) {
        throw new NotFoundException(`Device with ID "${deviceId}" not found`);
      }

      if (device.user_id !== user.id) {
        throw new UnauthorizedException(
          `You are not authorized to access device "${deviceId}"`,
        );
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `Device ownership validation failed for device ${deviceId}, user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Unable to validate device access');
    }
  }

  /**
   * Validate sensor type for MQTT calibration operations
   * Implements requirement 1.2
   */
  private validateMqttSensorType(sensorType: string): void {
    if (!this.MQTT_VALID_SENSORS.includes(sensorType)) {
      throw new BadRequestException(
        `Invalid sensor type for MQTT calibration: ${sensorType}. Valid types are: ${this.MQTT_VALID_SENSORS.join(', ')}`,
      );
    }
  }

  /**
   * Validate calibration data based on sensor type
   * Implements requirements 1.3, 1.4, 1.5
   */
  private validateCalibrationDataBySensorType(
    sensorType: string,
    calibrationData: Record<string, any>,
  ): void {
    if (!calibrationData || typeof calibrationData !== 'object') {
      throw new BadRequestException('Calibration data must be a valid object');
    }

    switch (sensorType) {
      case 'ph':
        // pH calibration requires 'm' (slope) and 'c' (intercept) - Requirement 1.3
        if (
          typeof calibrationData.m !== 'number' ||
          typeof calibrationData.c !== 'number'
        ) {
          throw new BadRequestException(
            'pH calibration data must contain numeric values for "m" (slope) and "c" (intercept)',
          );
        }
        // Validate reasonable ranges for pH calibration (relaxed ranges)
        if (
          Math.abs(calibrationData.m) > 50000 ||
          Math.abs(calibrationData.c) > 50000
        ) {
          throw new BadRequestException(
            'pH calibration values are outside reasonable ranges',
          );
        }
        break;

      case 'tds':
        // TDS calibration requires 'v' (voltage), 'std' (standard), and 't' (temperature) - Requirement 1.4
        if (
          typeof calibrationData.v !== 'number' ||
          typeof calibrationData.std !== 'number' ||
          typeof calibrationData.t !== 'number'
        ) {
          throw new BadRequestException(
            'TDS calibration data must contain numeric values for "v" (voltage), "std" (standard), and "t" (temperature)',
          );
        }
        // Validate reasonable ranges for TDS calibration
        if (calibrationData.v < 0 || calibrationData.v > 5) {
          throw new BadRequestException(
            'TDS voltage value must be between 0 and 5 volts',
          );
        }
        if (calibrationData.std < 0 || calibrationData.std > 10000) {
          throw new BadRequestException(
            'TDS standard value must be between 0 and 10000 ppm',
          );
        }
        if (calibrationData.t < -10 || calibrationData.t > 60) {
          throw new BadRequestException(
            'TDS temperature value must be between -10 and 60 degrees Celsius',
          );
        }
        break;

      case 'do':
        // DO calibration can be either single-point or two-point - Requirement 1.5
        const isSinglePoint = 'ref' in calibrationData && 'v' in calibrationData && 't' in calibrationData;
        const isTwoPoint = 'ref' in calibrationData && 'v1' in calibrationData && 't1' in calibrationData && 'v2' in calibrationData && 't2' in calibrationData;
        
        if (!isSinglePoint && !isTwoPoint) {
          throw new BadRequestException(
            'DO calibration data must contain either single-point format ("ref", "v", "t") or two-point format ("ref", "v1", "t1", "v2", "t2")',
          );
        }

        // Validate numeric values
        if (typeof calibrationData.ref !== 'number') {
          throw new BadRequestException('DO reference value must be a number');
        }

        if (isSinglePoint) {
          if (typeof calibrationData.v !== 'number' || typeof calibrationData.t !== 'number') {
            throw new BadRequestException(
              'DO single-point calibration data must contain numeric values for "v" (voltage) and "t" (temperature)',
            );
          }
        } else if (isTwoPoint) {
          if (
            typeof calibrationData.v1 !== 'number' ||
            typeof calibrationData.t1 !== 'number' ||
            typeof calibrationData.v2 !== 'number' ||
            typeof calibrationData.t2 !== 'number'
          ) {
            throw new BadRequestException(
              'DO two-point calibration data must contain numeric values for "v1", "t1", "v2", "t2"',
            );
          }
        }

        // Validate reasonable ranges for DO calibration
        if (calibrationData.ref < 0 || calibrationData.ref > 20) {
          throw new BadRequestException(
            'DO reference value must be between 0 and 20 mg/L',
          );
        }

        // Validate voltage ranges
        const voltageFields = isSinglePoint ? ['v'] : ['v1', 'v2'];
        const tempFields = isSinglePoint ? ['t'] : ['t1', 't2'];
        
        for (const field of voltageFields) {
          if (calibrationData[field] < 0 || calibrationData[field] > 5000) {
            throw new BadRequestException(
              `DO ${field} value must be between 0 and 5000 (mV or raw ADC)`,
            );
          }
        }

        for (const field of tempFields) {
          if (calibrationData[field] < -10 || calibrationData[field] > 60) {
            throw new BadRequestException(
              `DO ${field} value must be between -10 and 60 degrees Celsius`,
            );
          }
        }
        break;

      default:
        throw new BadRequestException(
          `Unsupported sensor type for calibration: ${sensorType}`,
        );
    }
  }

  private validateSensorType(sensorType: string): void {
    if (!this.VALID_SENSORS.includes(sensorType)) {
      throw new BadRequestException(`Invalid sensor type: ${sensorType}`);
    }
  }
}
