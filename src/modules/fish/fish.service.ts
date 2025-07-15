import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FishGrowthRepository } from './fish-growth.repository';
import { DevicesService } from '../devices/devices.service';
import { FishGrowth } from './entities/fish-growth.entity';
import { CreateFishGrowthDto } from './dto/create-fish-growth.dto';
import { UpdateFishGrowthDto } from './dto/update-fish-growth.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { Between } from 'typeorm';

@Injectable()
export class FishService {
  constructor(
    private readonly fishGrowthRepository: FishGrowthRepository,
    private readonly devicesService: DevicesService,
  ) {}

  async create(user: User, deviceId: string, createFishGrowthDto: CreateFishGrowthDto): Promise<FishGrowth> {
    await this.validateDeviceAccess(user, deviceId);

    const { length_cm, weight_gram } = createFishGrowthDto;

    const newGrowthRecord = this.fishGrowthRepository.create(createFishGrowthDto);
    newGrowthRecord.device_id = deviceId;
    newGrowthRecord.biomass_kg = this.calculateBiomass(length_cm, weight_gram);
    newGrowthRecord.condition_indicator = this.calculateConditionIndicator(length_cm, weight_gram);

    return this.fishGrowthRepository.save(newGrowthRecord);
  }

  async findAll(user: User, deviceId: string, startDate?: Date, endDate?: Date): Promise<FishGrowth[]> {
    await this.validateDeviceAccess(user, deviceId);

    const where: any = { device_id: deviceId };
    if (startDate && endDate) {
      where.measurement_date = Between(startDate, endDate);
    }

    return this.fishGrowthRepository.findAll({
      where,
      order: { measurement_date: 'ASC' },
    });
  }

  async findOne(user: User, id: string): Promise<FishGrowth> {
    const growthRecord = await this.fishGrowthRepository.findOne({ where: { id } });
    if (!growthRecord) {
      throw new NotFoundException(`Fish growth record with ID "${id}" not found`);
    }
    await this.validateDeviceAccess(user, growthRecord.device_id);
    return growthRecord;
  }

  async update(user: User, id: string, updateFishGrowthDto: UpdateFishGrowthDto): Promise<FishGrowth> {
    const growthRecord = await this.findOne(user, id);
    const { length_cm, weight_gram } = { ...growthRecord, ...updateFishGrowthDto };

    const updatedData = { ...updateFishGrowthDto };

    if (updateFishGrowthDto.length_cm || updateFishGrowthDto.weight_gram) {
      updatedData['biomass_kg'] = this.calculateBiomass(length_cm, weight_gram);
      updatedData['condition_indicator'] = this.calculateConditionIndicator(length_cm, weight_gram);
    }

    Object.assign(growthRecord, updatedData);
    return this.fishGrowthRepository.save(growthRecord);
  }

  async remove(user: User, id: string): Promise<void> {
    await this.findOne(user, id);
    await this.fishGrowthRepository.remove(id);
  }

  async getAnalytics(user: User, deviceId: string): Promise<any> {
    await this.validateDeviceAccess(user, deviceId);
    const growthData = await this.findAll(user, deviceId);

    if (growthData.length < 2) {
      return {
        growthRate: 0,
        trend: 'Insufficient data',
        summary: 'Not enough data to generate analytics.',
      };
    }

    const firstRecord = growthData[0];
    const lastRecord = growthData[growthData.length - 1];

    const timeDiff = new Date(lastRecord.measurement_date).getTime() - new Date(firstRecord.measurement_date).getTime();
    const days = Math.max(1, timeDiff / (1000 * 3600 * 24));

    const weightDiff = (lastRecord.weight_gram ?? 0) - (firstRecord.weight_gram ?? 0);
    const growthRate = weightDiff / days;

    return {
      growthRate: growthRate.toFixed(2),
      trend: growthRate > 0 ? 'Positive' : 'Negative',
      summary: `The average growth rate is ${growthRate.toFixed(2)} g/day.`,
      data: growthData.map(d => ({
        date: d.measurement_date,
        length: d.length_cm,
        weight: d.weight_gram,
        biomass: d.biomass_kg,
      })),
    };
  }

  private async validateDeviceAccess(user: User, deviceId: string): Promise<void> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return;
    }
    const device = await this.devicesService.findOne(deviceId, user);
    if (device.user.id !== user.id) {
      throw new ForbiddenException('You do not have access to this device.');
    }
  }

  private calculateBiomass(length_cm?: number, weight_gram?: number): number | null {
    if (length_cm && weight_gram) {
      return (length_cm * weight_gram) / 1000;
    }
    return null;
  }

  private calculateConditionIndicator(length_cm?: number, weight_gram?: number): string | null {
    if (length_cm && weight_gram) {
      const k = (100 * weight_gram) / Math.pow(length_cm, 3);
      if (k < 0.8) return 'Poor';
      if (k >= 0.8 && k < 1.2) return 'Good';
      if (k >= 1.2) return 'Excellent';
    }
    return null;
  }
}
