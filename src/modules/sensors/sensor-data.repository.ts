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
}