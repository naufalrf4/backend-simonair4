import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOneOptions } from 'typeorm';
import { Calibration } from './entities/calibration.entity';
import { CreateCalibrationDto } from './dto/create-calibration.dto';

@Injectable()
export class CalibrationRepository {
  constructor(
    @InjectRepository(Calibration)
    private readonly calibrationRepository: Repository<Calibration>,
  ) {}

  create(
    createCalibrationDto: CreateCalibrationDto | Partial<Calibration>,
  ): Calibration {
    return this.calibrationRepository.create(createCalibrationDto);
  }

  save(calibration: Calibration): Promise<Calibration> {
    return this.calibrationRepository.save(calibration);
  }

  findAll(options: FindManyOptions<Calibration>): Promise<Calibration[]> {
    return this.calibrationRepository.find(options);
  }

  findOne(options: FindOneOptions<Calibration>): Promise<Calibration | null> {
    return this.calibrationRepository.findOne(options);
  }

  async update(
    id: string,
    updateData: Partial<Calibration>,
  ): Promise<Calibration> {
    await this.calibrationRepository.update(id, updateData);
    const updated = await this.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Update failed, record not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.calibrationRepository.delete(id);
  }

  async findByDeviceId(
    deviceId: string,
    sensorType?: string,
  ): Promise<Calibration[]> {
    const where: any = { device_id: deviceId };
    if (sensorType) {
      where.sensor_type = sensorType;
    }
    return this.findAll({ where, order: { applied_at: 'DESC' } });
  }

  async clearBySensorType(deviceId: string, sensorType: string): Promise<any> {
    // This is a placeholder. The actual implementation will depend on how "cleared" is defined.
    // Assuming "cleared" means deleting the calibration records.
    return this.calibrationRepository.delete({
      device_id: deviceId,
      sensor_type: sensorType,
    });
  }

  async getLatestByDeviceAndSensor(
    deviceId: string,
    sensorType: string,
  ): Promise<Calibration | null> {
    return this.findOne({
      where: {
        device_id: deviceId,
        sensor_type: sensorType,
      },
      order: {
        applied_at: 'DESC',
      },
    });
  }

  /**
   * Find calibrations by device ID with pagination support
   * Used for calibration history retrieval
   */
  async findByDeviceIdWithPagination(
    deviceId: string,
    page: number = 1,
    limit: number = 10,
    sensorType?: string,
  ): Promise<{ calibrations: Calibration[]; total: number }> {
    const where: any = { device_id: deviceId };
    if (sensorType) {
      where.sensor_type = sensorType;
    }

    const [calibrations, total] = await this.calibrationRepository.findAndCount(
      {
        where,
        order: { applied_at: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    return { calibrations, total };
  }
}
