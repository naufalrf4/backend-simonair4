import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class DevicesRepository extends Repository<Device> {
  constructor(
    @InjectRepository(Device)
    private readonly repository: Repository<Device>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findByDeviceId(deviceId: string): Promise<Device | null> {
    return this.findOne({ where: { device_id: deviceId }, relations: ['user'] });
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    await this.update({ device_id: deviceId }, { last_seen: new Date() });
  }

  async checkExists(deviceId: string): Promise<boolean> {
    return this.count({ where: { device_id: deviceId } }).then(count => count > 0);
  }

  async findWithPagination(options: any): Promise<[Device[], number]> {
    const { user, page = 1, limit = 10, search } = options;
    const query = this.createQueryBuilder('device').leftJoinAndSelect('device.user', 'user');

    if (user.role === 'USER') {
      query.where('device.user_id = :userId', { userId: user.id });
    }

    if (search) {
      query.andWhere(
        '(device.device_id ILIKE :search OR device.device_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
}