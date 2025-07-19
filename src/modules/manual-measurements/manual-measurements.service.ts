import { Injectable } from '@nestjs/common';
import { ManualMeasurementRepository } from './repositories/manual-measurement.repository';

@Injectable()
export class ManualMeasurementsService {
  constructor(
    private readonly manualMeasurementRepository: ManualMeasurementRepository,
  ) {}
}
