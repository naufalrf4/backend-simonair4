import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { ThresholdsRepository } from './thresholds.repository';
import { DevicesService } from '../devices/devices.service';
import { MqttService } from '../mqtt/mqtt.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { AckService } from '../ack/ack.service';
import { Threshold } from './entities/threshold.entity';

@Injectable()
export class ThresholdsService {
  private readonly logger = new Logger(ThresholdsService.name);

  constructor(
    private readonly thresholdsRepository: ThresholdsRepository,
    private readonly devicesService: DevicesService,
    private readonly ackService: AckService,
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
      throw new NotFoundException(`Thresholds for device with ID "${deviceId}" not found.`);
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
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER)) {
      await this.devicesService.findOne(deviceId);
      return;
    }
    await this.devicesService.findOne(deviceId, user);
  }

  private validateThresholdData(data: CreateThresholdDto | UpdateThresholdDto): void {
    if (!data.threshold) {
      return;
    }
    const { ph_good, ph_bad, tds_good, tds_bad, do_good, do_bad, temp_low, temp_high } = data.threshold;

    if (ph_good !== undefined && ph_bad !== undefined && ph_good >= ph_bad) {
      throw new BadRequestException('ph_good must be less than ph_bad.');
    }
    if (tds_good !== undefined && tds_bad !== undefined && tds_good >= tds_bad) {
      throw new BadRequestException('tds_good must be less than tds_bad.');
    }
    if (do_good !== undefined && do_bad !== undefined && do_good >= do_bad) {
      throw new BadRequestException('do_good must be less than do_bad.');
    }
    if (temp_low !== undefined && temp_high !== undefined && temp_low >= temp_high) {
      throw new BadRequestException('temp_low must be less than temp_high.');
    }
  }

  async updateAckStatus(deviceId: string, ackStatus: string): Promise<void> {
    await this.thresholdsRepository.updateAckStatus(deviceId, ackStatus);
  }
}