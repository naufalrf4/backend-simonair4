import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ManualMeasurement } from '../entities/manual-measurement.entity';

@Injectable()
export class ManualMeasurementRepository extends Repository<ManualMeasurement> {
  constructor(private dataSource: DataSource) {
    super(ManualMeasurement, dataSource.createEntityManager());
  }
}
