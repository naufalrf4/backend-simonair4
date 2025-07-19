import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class DevicesRepository extends Repository<Device> {
  constructor(
    @InjectRepository(Device)
    private readonly repository: Repository<Device>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findByDeviceId(deviceId: string): Promise<Device | null> {
    return this.findOne({
      where: { device_id: deviceId },
      relations: ['user'],
    });
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    await this.update({ device_id: deviceId }, { last_seen: new Date() });
  }

  async checkExists(deviceId: string): Promise<boolean> {
    return this.count({ where: { device_id: deviceId } }).then(
      (count) => count > 0,
    );
  }

  async findWithPagination(options: any): Promise<[Device[], number]> {
    const { user, page = 1, limit = 10, search } = options;

    // First get the devices with count
    const baseQuery = this.createQueryBuilder('device').leftJoinAndSelect(
      'device.user',
      'user',
    );

    if (user.role === UserRole.USER) {
      baseQuery.where('device.user_id = :userId', { userId: user.id });
    }

    if (search) {
      baseQuery.andWhere(
        '(device.device_id ILIKE :search OR device.device_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [devices, total] = await baseQuery
      .orderBy('device.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Get latest sensor data for each device
    const devicesWithLatestData = await Promise.all(
      devices.map(async (device) => {
        const latestSensorData = await this.manager
          .createQueryBuilder()
          .select('sensor_data.*')
          .from('sensor_data', 'sensor_data')
          .where('sensor_data.device_id = :deviceId', {
            deviceId: device.device_id,
          })
          .orderBy('sensor_data.time', 'DESC')
          .limit(1)
          .getRawOne();

        return {
          ...device,
          latestSensorData: latestSensorData || null,
        };
      }),
    );

    return [devicesWithLatestData as Device[], total];
  }
}
