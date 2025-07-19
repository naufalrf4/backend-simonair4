import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SensorDataRepository } from './sensor-data.repository';
import { SensorData } from './entities/sensor-data.entity';
import { DevicesService } from '../devices/devices.service';
import { CalibrationsService } from '../calibrations/calibrations.service';
import { Calibration } from '../calibrations/entities/calibration.entity';
import { AlertsService } from '../alerts/alerts.service';
import { ThresholdsService } from '../thresholds/thresholds.service';
import { Threshold } from '../thresholds/entities/threshold.entity';
import { EventsGateway } from '../events/events.gateway';

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
    private readonly eventsGateway: EventsGateway,
  ) {}

  async processAndSaveData(
    deviceId: string,
    data: Partial<SensorData> & { do?: any },
  ): Promise<SensorData> {
    // Remove the redundant mapping since MQTT service already handles do -> do_level conversion
    const cleanedData = { ...data };
    delete cleanedData.do; // Remove do field if it exists

    // Device already provides calibrated data, status, and thresholds validation
    // Backend only needs to save and broadcast the received data
    const savedData = await this.sensorDataRepository.createSensorData({
      ...cleanedData,
      device_id: deviceId,
      time: data.timestamp ? new Date(data.timestamp) : new Date(),
      mqtt_published_at: new Date(),
    });

    // Only evaluate alerts if we still want backend alert processing
    await this.alertsService.evaluateThresholds(savedData);

    // Broadcast the data as received from device
    this.eventsGateway.broadcast(deviceId, {
      ...savedData,
      source: 'device'
    });
    
    this.logger.log(`Received and saved sensor data for device ${deviceId}`, {
      deviceId,
      timestamp: savedData.time
    });
    
    return savedData;
  }

  private async applyCalibration(
    deviceId: string,
    data: Partial<SensorData>,
  ): Promise<Partial<SensorData>> {
    // Device already provides calibrated data, no backend calibration needed
    this.logger.debug(`Device ${deviceId} already provides calibrated data, skipping backend calibration`);
    return data;
  }

  private async getDeviceThreshold(
    deviceId: string,
  ): Promise<Threshold | null> {
    try {
      
      return await this.thresholdsService.getThreshold(deviceId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(
          `No thresholds found for device ${deviceId}. Using default values.`,
        );
        return null;
      }
      throw error;
    }
  }

  private calculateStatus(
    data: Partial<SensorData>,
    threshold: Threshold | null,
  ): Partial<SensorData> {
    // Device already provides status information, no backend calculation needed
    this.logger.debug(`Device already provides status data, skipping backend status calculation`);
    return data;
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

  async getHistoricalDataWithPagination(
    deviceId: string,
    options: {
      page?: number;
      limit?: number;
      from?: Date;
      to?: Date;
      orderBy?: 'ASC' | 'DESC';
    },
  ): Promise<{
    data: SensorData[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Validate device exists and user has access
    await this.devicesService.validateDevice(deviceId);

    const [data, total] =
      await this.sensorDataRepository.findHistoricalDataWithPagination(
        deviceId,
        options,
      );

    return {
      data,
      total,
      page: options.page || 1,
      limit: options.limit || 10,
    };
  }

  async getLatestSensorData(deviceId: string): Promise<SensorData | null> {
    // Validate device exists and user has access
    await this.devicesService.validateDevice(deviceId);

    return this.sensorDataRepository.findLatestSensorData(deviceId);
  }

  async getAggregatedData(
    deviceId: string,
    from: Date,
    to: Date,
    granularity: 'hourly' | 'daily',
  ): Promise<any[]> {
    // Validate device exists and user has access
    await this.devicesService.validateDevice(deviceId);

    return this.sensorDataRepository.findAggregatedData(
      deviceId,
      from,
      to,
      granularity,
    );
  }

  async getAggregatedDataWithPagination(
    deviceId: string,
    options: {
      page?: number;
      limit?: number;
      from: Date;
      to: Date;
      granularity: 'hourly' | 'daily';
    },
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    // Validate device exists and user has access
    await this.devicesService.validateDevice(deviceId);

    const { page = 1, limit = 10, from, to, granularity } = options;

    const allData = await this.sensorDataRepository.findAggregatedData(
      deviceId,
      from,
      to,
      granularity,
    );

    const total = allData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = allData.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
