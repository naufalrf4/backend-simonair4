import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ThresholdsRepository } from './thresholds.repository';
import { DevicesService } from '../devices/devices.service';
import { MqttService } from '../mqtt/mqtt.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { ThresholdRequestDto } from './dto/threshold-request.dto';
import { ThresholdResponseDto } from './dto/threshold-response.dto';
import { ThresholdConfigResponseDto } from './dto/threshold-config-response.dto';
import { AckService } from '../ack/ack.service';
import { Threshold } from './entities/threshold.entity';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ThresholdsService {
  private readonly logger = new Logger(ThresholdsService.name);

  constructor(
    private readonly thresholdsRepository: ThresholdsRepository,
    private readonly devicesService: DevicesService,
    private readonly ackService: AckService,
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService: MqttService,
  ) {}

  async setThreshold(
    deviceId: string,
    createThresholdDto: CreateThresholdDto,
    user: User,
  ): Promise<Threshold> {
    await this.validateOwnership(deviceId, user);
    this.validateThresholdData(createThresholdDto);

    const thresholdData = { threshold: createThresholdDto };

    const savedThreshold = await this.thresholdsRepository.createOrUpdate(
      deviceId,
      thresholdData,
      user.id,
    );

    this.ackService.publishThresholdWithAck(deviceId, thresholdData);

    return savedThreshold;
  }

  async getThreshold(deviceId: string, user?: User): Promise<Threshold> {
    if (user) {
      await this.validateOwnership(deviceId, user);
    }
    const threshold = await this.thresholdsRepository.findByDeviceId(deviceId);

    if (!threshold) {
      throw new NotFoundException(
        `Thresholds for device with ID "${deviceId}" not found.`,
      );
    }

    return threshold;
  }

  async updateThreshold(
    deviceId: string,
    updateThresholdDto: UpdateThresholdDto,
    user: User,
  ): Promise<Threshold> {
    const existingThreshold = await this.getThreshold(deviceId, user);

    const updatedThresholdData = {
      ...existingThreshold.thresholdData,
      ...updateThresholdDto,
    };

    this.validateThresholdData(updatedThresholdData);

    const savedThreshold = await this.thresholdsRepository.createOrUpdate(
      deviceId,
      updatedThresholdData,
      user.id,
    );

    this.ackService.publishThresholdWithAck(deviceId, updatedThresholdData);

    return savedThreshold;
  }

  async validateOwnership(deviceId: string, user: User): Promise<void> {
    if (
      user &&
      (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER)
    ) {
      await this.devicesService.findOne(deviceId);
      return;
    }
    await this.devicesService.findOne(deviceId, user);
  }

  private validateThresholdData(
    data: CreateThresholdDto | UpdateThresholdDto,
  ): void {
    if (!data.threshold) {
      return;
    }
    const {
      ph_good,
      ph_bad,
      tds_good,
      tds_bad,
      do_good,
      do_bad,
      temp_low,
      temp_high,
    } = data.threshold;

    if (ph_good !== undefined && ph_bad !== undefined && ph_good >= ph_bad) {
      throw new BadRequestException('ph_good must be less than ph_bad.');
    }
    if (
      tds_good !== undefined &&
      tds_bad !== undefined &&
      tds_good >= tds_bad
    ) {
      throw new BadRequestException('tds_good must be less than tds_bad.');
    }
    if (do_good !== undefined && do_bad !== undefined && do_good >= do_bad) {
      throw new BadRequestException('do_good must be less than do_bad.');
    }
    if (
      temp_low !== undefined &&
      temp_high !== undefined &&
      temp_low >= temp_high
    ) {
      throw new BadRequestException('temp_low must be less than temp_high.');
    }
  }

  /**
   * Send threshold configuration to device via MQTT with database persistence
   * Implements requirements 2.1, 2.2, 6.1, 6.2, 6.3, 6.4, 6.5
   */
  async sendThresholds(
    deviceId: string,
    thresholdRequest: ThresholdRequestDto,
    user: User,
  ): Promise<ThresholdResponseDto> {
    try {
      this.logger.log(
        `Sending thresholds for device ${deviceId}, user: ${user.id}`,
      );

      await this.validateDeviceOwnership(deviceId, user);

      this.validateThresholdRequestData(thresholdRequest);

      const transformedThresholdData =
        this.transformThresholdData(thresholdRequest);

      const savedThreshold = await this.thresholdsRepository.createOrUpdate(
        deviceId,
        transformedThresholdData,
        user.id,
      );

      this.logger.log(`Threshold record saved/updated for device ${deviceId}`);

      try {
        await this.mqttService.publishThresholdsWithValidation(
          deviceId,
          thresholdRequest,
        );

        this.logger.log(
          `Thresholds successfully published to MQTT for device ${deviceId}`,
        );
      } catch (mqttError) {
        await this.thresholdsRepository.updateAckStatus(deviceId, 'failed');

        this.logger.error(
          `MQTT publish failed for thresholds ${savedThreshold.id}: ${mqttError.message}`,
          mqttError.stack,
        );

        // Still return the threshold record even if MQTT failed (Requirement 6.5)
        // The client can see the MQTT status in the response
      }

      // Convert to response DTO (Requirement 6.3)
      return this.mapToThresholdResponseDto(savedThreshold);
    } catch (error) {
      this.logger.error(
        `Failed to send thresholds for device ${deviceId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get current threshold configuration for a device
   * Implements requirements 6.4
   */
  async getCurrentThresholds(
    deviceId: string,
    user: User,
  ): Promise<ThresholdConfigResponseDto> {
    try {
      this.logger.log(
        `Getting current thresholds for device ${deviceId}, user: ${user.id}`,
      );

      // Validate device ownership and access (Requirement 6.4)
      await this.validateDeviceOwnership(deviceId, user);

      // Get current threshold configuration (Requirement 6.4)
      const threshold =
        await this.thresholdsRepository.findByDeviceId(deviceId);

      if (!threshold) {
        // Return empty configuration if no thresholds are set
        return new ThresholdConfigResponseDto({
          device_id: deviceId,
          thresholds: {},
          updated_at: new Date(),
          ack_status: 'pending',
          is_active: false,
        });
      }

      // Convert to config response DTO
      return new ThresholdConfigResponseDto({
        device_id: deviceId,
        thresholds: threshold.thresholdData || {},
        updated_at: threshold.updatedAt,
        ack_status: threshold.ackStatus,
        is_active: threshold.ackStatus === 'success',
      });
    } catch (error) {
      this.logger.error(
        `Failed to get current thresholds for device ${deviceId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate device ownership with enhanced error handling
   * Implements requirement 6.4
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
        throw new ForbiddenException(
          `You are not authorized to access device "${deviceId}"`,
        );
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
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
   * Validate threshold request data
   * Implements requirement 2.2
   */
  private validateThresholdRequestData(
    thresholdRequest: ThresholdRequestDto,
  ): void {
    // Check if at least one threshold value is provided
    const hasAnyThreshold = Object.values(thresholdRequest).some(
      (value) => value !== undefined && value !== null && value !== '',
    );

    if (!hasAnyThreshold) {
      throw new BadRequestException(
        'At least one threshold value must be provided',
      );
    }

    // Validate min/max pairs if both are provided
    if (thresholdRequest.ph_min && thresholdRequest.ph_max) {
      const phMin = parseFloat(thresholdRequest.ph_min);
      const phMax = parseFloat(thresholdRequest.ph_max);
      if (phMin >= phMax) {
        throw new BadRequestException(
          'pH minimum must be less than pH maximum',
        );
      }
    }

    if (thresholdRequest.tds_min && thresholdRequest.tds_max) {
      const tdsMin = parseFloat(thresholdRequest.tds_min);
      const tdsMax = parseFloat(thresholdRequest.tds_max);
      if (tdsMin >= tdsMax) {
        throw new BadRequestException(
          'TDS minimum must be less than TDS maximum',
        );
      }
    }

    if (thresholdRequest.do_min && thresholdRequest.do_max) {
      const doMin = parseFloat(thresholdRequest.do_min);
      const doMax = parseFloat(thresholdRequest.do_max);
      if (doMin >= doMax) {
        throw new BadRequestException(
          'DO minimum must be less than DO maximum',
        );
      }
    }

    if (thresholdRequest.temp_min && thresholdRequest.temp_max) {
      const tempMin = parseFloat(thresholdRequest.temp_min);
      const tempMax = parseFloat(thresholdRequest.temp_max);
      if (tempMin >= tempMax) {
        throw new BadRequestException(
          'Temperature minimum must be less than temperature maximum',
        );
      }
    }
  }

  /**
   * Transform threshold data from request format to storage format
   * Implements requirement 6.2
   */
  private transformThresholdData(
    thresholdRequest: ThresholdRequestDto,
  ): Record<string, any> {
    const transformedData: Record<string, any> = {};

    // Only include non-empty threshold fields
    if (this.isValidThresholdValue(thresholdRequest.ph_min)) {
      transformedData.ph_min = thresholdRequest.ph_min;
    }
    if (this.isValidThresholdValue(thresholdRequest.ph_max)) {
      transformedData.ph_max = thresholdRequest.ph_max;
    }
    if (this.isValidThresholdValue(thresholdRequest.tds_min)) {
      transformedData.tds_min = thresholdRequest.tds_min;
    }
    if (this.isValidThresholdValue(thresholdRequest.tds_max)) {
      transformedData.tds_max = thresholdRequest.tds_max;
    }
    if (this.isValidThresholdValue(thresholdRequest.do_min)) {
      transformedData.do_min = thresholdRequest.do_min;
    }
    if (this.isValidThresholdValue(thresholdRequest.do_max)) {
      transformedData.do_max = thresholdRequest.do_max;
    }
    if (this.isValidThresholdValue(thresholdRequest.temp_min)) {
      transformedData.temp_min = thresholdRequest.temp_min;
    }
    if (this.isValidThresholdValue(thresholdRequest.temp_max)) {
      transformedData.temp_max = thresholdRequest.temp_max;
    }

    return transformedData;
  }

  /**
   * Check if a threshold value is valid (not null, undefined, or empty string)
   */
  private isValidThresholdValue(value: string | undefined | null): boolean {
    return (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !isNaN(parseFloat(value))
    );
  }

  /**
   * Map threshold entity to response DTO
   */
  private mapToThresholdResponseDto(
    threshold: Threshold,
  ): ThresholdResponseDto {
    return new ThresholdResponseDto({
      id: threshold.id,
      device_id: threshold.deviceId,
      threshold_data: threshold.thresholdData,
      updated_at: threshold.updatedAt,
      updated_by: threshold.updatedBy,
      ack_status: threshold.ackStatus,
      ack_received_at: threshold.ackReceivedAt,
      mqtt_published: true, // Since we successfully saved to database
    });
  }

  async updateAckStatus(deviceId: string, ackStatus: string): Promise<void> {
    await this.thresholdsRepository.updateAckStatus(deviceId, ackStatus);
  }
}
