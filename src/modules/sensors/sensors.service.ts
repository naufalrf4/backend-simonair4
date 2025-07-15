import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { SensorDataRepository } from './sensor-data.repository';
import { SensorData } from './entities/sensor-data.entity';
import { DevicesService } from '../devices/devices.service';
import { CalibrationsService } from '../calibrations/calibrations.service';
import { Calibration } from '../calibrations/entities/calibration.entity';
import { AlertsService } from '../alerts/alerts.service';
import { ThresholdsService } from '../thresholds/thresholds.service';
import { Threshold } from '../thresholds/entities/threshold.entity';

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);

  constructor(
    private readonly sensorDataRepository: SensorDataRepository,
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => CalibrationsService))
    private readonly calibrationsService: CalibrationsService,
    private readonly alertsService: AlertsService,
    @Inject(forwardRef(() => ThresholdsService))
    private readonly thresholdsService: ThresholdsService,
  ) {}

  async processAndSaveData(
    deviceId: string,
    data: Partial<SensorData>,
  ): Promise<SensorData> {
    const calibratedData = await this.applyCalibration(deviceId, data);
    const threshold = await this.getDeviceThreshold(deviceId);
    const processedData = this.calculateStatus(calibratedData, threshold);

    const savedData = await this.sensorDataRepository.createSensorData({
      ...processedData,
      device_id: deviceId,
      time: data.timestamp ? new Date(data.timestamp) : new Date(),
    });

    // The user is not available in this context, so we pass null.
    // The alerts service will need to handle this case.
    await this.alertsService.evaluateThresholds(savedData);

    this.logger.log(`Processed and saved sensor data for device ${deviceId}`);
    return savedData;
  }

  private async applyCalibration(
    deviceId: string,
    data: Partial<SensorData>,
  ): Promise<Partial<SensorData>> {
    const calibrations = await this.calibrationsService.findAll(deviceId);
    if (calibrations.length === 0) {
      this.logger.warn(`No calibrations found for device ${deviceId}. Using raw values.`);
      return data;
    }

    const calibratedData = JSON.parse(JSON.stringify(data)); // Deep copy

    for (const sensorType of ['ph', 'tds', 'do']) {
      if (calibratedData[sensorType] && calibratedData[sensorType].raw !== undefined) {
        const calibration = this.findLatestCalibration(calibrations, sensorType);
        if (calibration && calibration.calibration_data) {
          const { m, c } = calibration.calibration_data;
          if (typeof m === 'number' && typeof c === 'number') {
            calibratedData[sensorType].calibrated = calibratedData[sensorType].raw * m + c;
            calibratedData[sensorType].calibrated_ok = true;
          } else {
            calibratedData[sensorType].calibrated_ok = false;
          }
        } else {
          calibratedData[sensorType].calibrated_ok = false;
        }
      }
    }
    return calibratedData;
  }

  private async getDeviceThreshold(deviceId: string): Promise<Threshold | null> {
    try {
      // No user is passed for internal service calls
      return await this.thresholdsService.getThreshold(deviceId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`No thresholds found for device ${deviceId}. Using default values.`);
        return null;
      }
      throw error;
    }
  }

  private calculateStatus(data: Partial<SensorData>, threshold: Threshold | null): Partial<SensorData> {
    const processedData = { ...data };
    const defaultThresholds = {
      temperature: { temp_low: 25, temp_high: 30 },
      ph: { ph_good: 6.5, ph_bad: 7.5 },
      tds: { tds_good: 100, tds_bad: 500 },
      do: { do_good: 5, do_bad: 8 },
    };

    const deviceThresholds = threshold ? threshold.thresholdData.threshold : {};

    const getThresholdsFor = (sensorType: string) => {
      switch (sensorType) {
        case 'temperature':
          return { min: deviceThresholds.temp_low ?? defaultThresholds.temperature.temp_low, max: deviceThresholds.temp_high ?? defaultThresholds.temperature.temp_high };
        case 'ph':
          return { min: deviceThresholds.ph_good ?? defaultThresholds.ph.ph_good, max: deviceThresholds.ph_bad ?? defaultThresholds.ph.ph_bad };
        case 'tds':
          return { min: deviceThresholds.tds_good ?? defaultThresholds.tds.tds_good, max: deviceThresholds.tds_bad ?? defaultThresholds.tds.tds_bad };
        case 'do':
          return { min: deviceThresholds.do_good ?? defaultThresholds.do.do_good, max: deviceThresholds.do_bad ?? defaultThresholds.do.do_bad };
        default:
          return null;
      }
    };

    for (const sensorType of ['temperature', 'ph', 'tds', 'do']) {
      if (processedData[sensorType]) {
        const thresholds = getThresholdsFor(sensorType);
        if (thresholds) {
          const value = processedData[sensorType].calibrated ?? processedData[sensorType].value ?? processedData[sensorType].raw;
          if (value !== undefined) {
            processedData[sensorType].status =
              value >= thresholds.min && value <= thresholds.max
                ? 'GOOD'
                : 'BAD';
          }
        }
      }
    }
    return processedData;
  }

  private findLatestCalibration(
    calibrations: Calibration[],
    sensorType: string,
  ): Calibration | undefined {
    return calibrations
      .filter((c) => c.sensor_type === sensorType)
      .sort((a, b) => b.applied_at.getTime() - a.applied_at.getTime())[0];
  }

  async getHistoricalData(
    deviceId: string,
    from: Date,
    to: Date,
  ): Promise<SensorData[]> {
    return this.sensorDataRepository.findHistoricalData(deviceId, from, to);
  }

  async getAggregatedData(
    deviceId: string,
    from: Date,
    to: Date,
    granularity: 'hourly' | 'daily',
  ): Promise<any[]> {
    return this.sensorDataRepository.findAggregatedData(
      deviceId,
      from,
      to,
      granularity,
    );
  }
}
