import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Threshold } from './entities/threshold.entity';

@Injectable()
export class ThresholdsRepository extends Repository<Threshold> {
  constructor(private dataSource: DataSource) {
    super(Threshold, dataSource.createEntityManager());
  }

  async findByDeviceId(deviceId: string): Promise<Threshold | null> {
    return this.findOne({ where: { deviceId } });
  }

  async createOrUpdate(
    deviceId: string,
    thresholdData: Record<string, any>,
    userId: string,
  ): Promise<Threshold> {
    const existingThreshold = await this.findByDeviceId(deviceId);

    if (existingThreshold) {
      existingThreshold.thresholdData = thresholdData;
      existingThreshold.updatedBy = userId;
      existingThreshold.updatedAt = new Date();
      return this.save(existingThreshold);
    }

    const newThreshold = this.create({
      deviceId,
      thresholdData,
      updatedBy: userId,
    });

    return this.save(newThreshold);
  }

  async updateAckStatus(
    deviceId: string,
    ackStatus: string,
  ): Promise<Threshold | null> {
    const threshold = await this.findByDeviceId(deviceId);
    if (threshold) {
      threshold.ackStatus = ackStatus;
      threshold.ackReceivedAt = new Date();
      return this.save(threshold);
    }
    return null;
  }
}