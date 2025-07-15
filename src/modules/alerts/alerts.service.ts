import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway';
import { EventsService } from '../events/events.service';
import { SensorData } from '../sensors/entities/sensor-data.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly eventsService: EventsService,
  ) {}

  async evaluateThresholds(sensorData: SensorData, user?: User): Promise<void> {
    const { device_id, ph, temperature, tds, do_level } = sensorData;

    const thresholds = {
      ph: { min: 6.5, max: 8.5 },
      temperature: { min: 25, max: 32 },
      tds: { min: 100, max: 500 },
      do_level: { min: 4, max: 8 },
    };

    const alerts: { event_type: string; description: string }[] = [];

    if (ph && ph.value !== undefined && (ph.value < thresholds.ph.min || ph.value > thresholds.ph.max)) {
      alerts.push({
        event_type: 'critical_ph',
        description: `pH level is ${ph.value}, which is outside the optimal range.`,
      });
    }

    if (temperature && temperature.value !== undefined && (temperature.value < thresholds.temperature.min || temperature.value > thresholds.temperature.max)) {
      alerts.push({
        event_type: 'critical_temperature',
        description: `Temperature is ${temperature.value}°C, which is outside the optimal range.`,
      });
    }

    if (tds && tds.value !== undefined && (tds.value < thresholds.tds.min || tds.value > thresholds.tds.max)) {
      alerts.push({
        event_type: 'critical_tds',
        description: `TDS level is ${tds.value} ppm, which is outside the optimal range.`,
      });
    }

    if (do_level && do_level.value !== undefined && (do_level.value < thresholds.do_level.min || do_level.value > thresholds.do_level.max)) {
      alerts.push({
        event_type: 'critical_do_level',
        description: `Dissolved Oxygen level is ${do_level.value} mg/L, which is outside the optimal range.`,
      });
    }

    for (const alert of alerts) {
      this.logger.warn(`CRITICAL ALERT for device ${device_id}: ${alert.description}`);
      
      await this.eventsService.create({
        device_id,
        event_type: alert.event_type,
        description: alert.description,
        event_date: new Date(),
      }, user);

      this.eventsGateway.sendToRoom(device_id, 'alert', alert);
    }
  }
}