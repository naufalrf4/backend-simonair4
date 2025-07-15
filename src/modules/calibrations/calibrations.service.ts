import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CalibrationRepository } from './calibration.repository';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Calibration } from './entities/calibration.entity';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class CalibrationsService {
  private readonly VALID_SENSORS = ['ph', 'tds', 'do', 'temperature'];

  constructor(
    private readonly calibrationRepository: CalibrationRepository,
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService: MqttService,
  ) {}

  async create(
    deviceId: string,
    createCalibrationDto: CreateCalibrationDto,
    user: User,
  ): Promise<void> {
    const { sensor_type, calibration_data } = createCalibrationDto;
    await this.validateDeviceAccess(deviceId, user);
    this.validateSensorType(sensor_type);

    // 5. Validation (CalibrationService)
    if (!calibration_data || typeof calibration_data.m !== 'number' || typeof calibration_data.c !== 'number') {
      throw new BadRequestException('Invalid calibration data format. Expecting { "m": number, "c": number }');
    }

    // 6. Store (CalibrationRepository)
    const calibration = this.calibrationRepository.create({
      device_id: deviceId,
      sensor_type,
      calibration_data,
    });
    calibration.applied_by = user.id;
    await this.calibrationRepository.save(calibration);

    // 7. Publish MQTT
    this.mqttService.publishCalibration(deviceId, { [sensor_type]: calibration_data });

    // The timeout logic is now handled within the MqttService
  }

  async findAll(
    deviceId: string,
    user?: User,
    sensorType?: string,
  ): Promise<Calibration[]> {
    await this.validateDeviceAccess(deviceId, user);
    return this.calibrationRepository.findByDeviceId(deviceId, sensorType);
  }

  async clear(deviceId: string, sensorType: string, user: User): Promise<void> {
    await this.validateDeviceAccess(deviceId, user);
    this.validateSensorType(sensorType);

    await this.calibrationRepository.clearBySensorType(deviceId, sensorType);

    const topic = `simonair/${deviceId}/calibrate/clear`;
    const payload = JSON.stringify({ sensor_type: sensorType });
    this.mqttService.publishWithRetry(topic, payload, { qos: 1 });
  }

  async getStatus(deviceId: string, user: User): Promise<any> {
    await this.validateDeviceAccess(deviceId, user);
    const statuses = await Promise.all(
      this.VALID_SENSORS.map(async (sensor) => {
        const latest =
          await this.calibrationRepository.getLatestByDeviceAndSensor(
            deviceId,
            sensor,
          );
        return {
          sensor,
          latest_calibration: latest,
          is_calibrated: !!latest,
        };
      }),
    );
    return statuses;
  }

  async apply(id: string, user: User): Promise<Calibration> {
    const calibration = await this.calibrationRepository.findOne({
      where: { id },
    });
    if (!calibration) {
      throw new NotFoundException('Calibration not found');
    }
    await this.validateDeviceAccess(calibration.device_id, user);

    const updatedCalibration = await this.calibrationRepository.update(id, {
      applied_at: new Date(),
      applied_by: user.id,
    });

    const topic = `simonair/${calibration.device_id}/calibrate`;
    const payload = JSON.stringify(updatedCalibration.calibration_data);
    this.mqttService.publishWithRetry(topic, payload, { qos: 1 });

    return updatedCalibration;
  }

  private async validateDeviceAccess(
    deviceId: string,
    user?: User,
  ): Promise<void> {
    if (!user) {
      // Internal access, no user validation needed
      return;
    }
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return;
    }
    const device = await this.devicesService.findOne(deviceId, user);
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    if (device.user_id !== user.id) {
      throw new UnauthorizedException();
    }
  }

  private validateSensorType(sensorType: string): void {
    if (!this.VALID_SENSORS.includes(sensorType)) {
      throw new BadRequestException(`Invalid sensor type: ${sensorType}`);
    }
  }
}
