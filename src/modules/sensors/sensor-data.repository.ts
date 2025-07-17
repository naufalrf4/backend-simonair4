import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SensorData } from './entities/sensor-data.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SensorDataRepository extends Repository<SensorData> {
  constructor(
    @InjectRepository(SensorData)
    private readonly repository: Repository<SensorData>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async createSensorData(data: Partial<SensorData>): Promise<SensorData> {
    const newSensorData = this.create({
      ...data,
      time: new Date(),
    });
    return this.save(newSensorData);
  }

  async findHistoricalData(
    deviceId: string,
    from: Date,
    to: Date,
  ): Promise<SensorData[]> {
    return this.createQueryBuilder('sensor_data')
      .where('sensor_data.device_id = :deviceId', { deviceId })
      .andWhere('sensor_data.time BETWEEN :from AND :to', { from, to })
      .orderBy('sensor_data.time', 'DESC')
      .getMany();
  }

  async findHistoricalDataWithPagination(
    deviceId: string,
    options: {
      page?: number;
      limit?: number;
      from?: Date;
      to?: Date;
      orderBy?: 'ASC' | 'DESC';
    },
  ): Promise<[SensorData[], number]> {
    const { page = 1, limit = 10, from, to, orderBy = 'DESC' } = options;

    const query = this.createQueryBuilder('sensor_data')
      .where('sensor_data.device_id = :deviceId', { deviceId });

    if (from && to) {
      query.andWhere('sensor_data.time BETWEEN :from AND :to', { from, to });
    } else if (from) {
      query.andWhere('sensor_data.time >= :from', { from });
    } else if (to) {
      query.andWhere('sensor_data.time <= :to', { to });
    }

    return query
      .orderBy('sensor_data.time', orderBy)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findAggregatedData(
    deviceId: string,
    from: Date,
    to: Date,
    granularity: 'hourly' | 'daily',
  ): Promise<any[]> {
    const timeBucket =
      granularity === 'hourly'
        ? "time_bucket('1 hour', time)"
        : "time_bucket('1 day', time)";

    return this.createQueryBuilder('sensor_data')
      .select(timeBucket, 'bucket')
      .addSelect('avg((ph->>\'value\')::numeric)', 'avg_ph')
      .addSelect('avg((temperature->>\'value\')::numeric)', 'avg_temperature')
      .addSelect('avg((tds->>\'value\')::numeric)', 'avg_tds')
      .addSelect('avg((do_level->>\'value\')::numeric)', 'avg_do_level')
      .where('device_id = :deviceId', { deviceId })
      .andWhere('time BETWEEN :from AND :to', { from, to })
      .groupBy('bucket')
      .orderBy('bucket', 'DESC')
      .getRawMany();
  }

  async findLatestSensorData(deviceId: string): Promise<SensorData | null> {
    return this.createQueryBuilder('sensor_data')
      .where('sensor_data.device_id = :deviceId', { deviceId })
      .orderBy('sensor_data.time', 'DESC')
      .getOne();
  }
}