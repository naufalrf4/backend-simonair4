import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { EventsGateway } from '../events/events.gateway';
import { SensorsService } from '../sensors/sensors.service';
import { DevicesService } from '../devices/devices.service';
import { Cache } from 'cache-manager';
import { SensorData } from '../sensors/entities/sensor-data.entity';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private logger: Logger = new Logger('MqttService');
  private retryCount = 0;
  private topicPrefix: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => SensorsService))
    private readonly sensorsService: SensorsService,
    private readonly devicesService: DevicesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.topicPrefix = this.configService.get<string>('mqtt.topicPrefix', 'simonair/');
  }

  onModuleInit() {
    this.connect();
  }

  private connect() {
    const mqttConfig = this.configService.get('mqtt');
    const connectUrl = mqttConfig.brokerUrl;
    const clientId = `${mqttConfig.clientId}-${Date.now()}`;

    this.client = mqtt.connect(connectUrl, {
      clientId,
      username: mqttConfig.username,
      password: mqttConfig.password,
      reconnectPeriod: 0, // Disable automatic reconnect to handle it manually
      connectTimeout: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      this.retryCount = 0; // Reset retry count on successful connection
      this.subscribeToTopics();
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT Client Error: ${err.message}`);
      this.handleDisconnect();
    });

    this.client.on('close', () => {
      this.logger.warn('MQTT connection closed.');
      this.handleDisconnect();
    });

    this.client.on('message', (topic, payload) => {
      this.handleMqttMessage(topic, payload);
    });
  }

  private handleDisconnect() {
    if (this.retryCount >= 3) {
      this.logger.error('MQTT connection failed after 3 retries. Please check the broker status.');
      // In a real-world scenario, you might want to throw an exception or notify an admin.
      return;
    }

    this.retryCount++;
    const delay = 5000 * this.retryCount; // Exponential backoff
    this.logger.log(`Attempting to reconnect in ${delay / 1000} seconds (Attempt ${this.retryCount}/3)`);
    setTimeout(() => this.connect(), delay);
  }

  private subscribeToTopics() {
    const dataTopic = `${this.topicPrefix}+/data`;
    const ackTopic = `${this.topicPrefix}+/calibrate/ack`;
    const offsetAckTopic = `${this.topicPrefix}+/offset/ack`;

    this.client.subscribe(dataTopic, { qos: 1 }, (err) => {
      if (!err) {
        this.logger.log(`Subscribed to topic ${dataTopic}`);
      }
    });

    this.client.subscribe(ackTopic, { qos: 1 }, (err) => {
      if (!err) {
        this.logger.log(`Subscribed to topic ${ackTopic}`);
      }
    });

    this.client.subscribe(offsetAckTopic, { qos: 1 }, (err) => {
      if (!err) {
        this.logger.log(`Subscribed to topic ${offsetAckTopic}`);
      }
    });
  }

  private async handleMqttMessage(topic: string, payload: Buffer) {
    const topicParts = topic.split('/');
    const deviceId = topicParts[1];

    if (!deviceId) {
      this.logger.error(`Device ID not found in topic: ${topic}`);
      return;
    }

    if (topic.endsWith('/data')) {
      await this.handleSensorDataMessage(deviceId, payload);
    } else if (topic.endsWith('/calibrate/ack')) {
      this.handleCalibrationAckMessage(deviceId, payload);
    } else if (topic.endsWith('/offset/ack')) {
      // This will be handled by the AckService, but we need to forward the message.
      // In a real implementation, you would use an event emitter or a message queue.
      // For simplicity, we will log it here.
      this.logger.log(`Offset ACK received for device ${deviceId}`);
    } else {
      this.logger.warn(`Unhandled topic: ${topic}`);
    }
  }

  private async handleSensorDataMessage(deviceId: string, payload: Buffer) {
    const lastMessageTimestamp = await this.cacheManager.get<number>(`last_message_${deviceId}`);
    const now = Date.now();
    if (lastMessageTimestamp && (now - lastMessageTimestamp) < 10000) { // Throttle to 1 message every 10 seconds
      this.logger.warn(`Throttling message for device ${deviceId}.`);
      return;
    }

    let data: Partial<SensorData>;
    try {
      data = JSON.parse(payload.toString());
      if (!this.isValidSensorPayload(data)) {
        this.logger.error(`Invalid payload structure for device ${deviceId}: ${payload.toString()}`);
        return;
      }
    } catch (error) {
      this.logger.error(`Failed to parse JSON payload for device ${deviceId}: ${payload.toString()}`, error.stack);
      return;
    }

    try {
      await this.devicesService.validateDevice(deviceId);
    } catch (error) {
      this.logger.warn(`Device validation failed for ${deviceId}: ${error.message}`);
      return;
    }

    await this.devicesService.updateLastSeen(deviceId);
    await this.sensorsService.processAndSaveData(deviceId, data);
    await this.cacheManager.set(`last_message_${deviceId}`, now, 10);
  }

  private handleCalibrationAckMessage(deviceId: string, payload: Buffer) {
    this.logger.log(`Calibration ACK received for device ${deviceId}`);
    try {
      const ack = JSON.parse(payload.toString());
      this.eventsGateway.sendToRoom(`device:${deviceId}`, 'calibrationAck', ack);
    } catch (error) {
      this.logger.error(`Failed to parse calibration ACK for device ${deviceId}: ${payload.toString()}`, error.stack);
    }
  }

  private isValidSensorPayload(payload: any): payload is Partial<SensorData> {
    return ['timestamp', 'temperature', 'ph', 'tds', 'do'].every(key => key in payload);
  }

  publishCalibration(deviceId: string, calibrationData: any) {
    const topic = `${this.topicPrefix}${deviceId}/calibration`;
    const payload = JSON.stringify(calibrationData);
    this.publishWithRetry(topic, payload, { qos: 1 });
  }

  publishOffset(deviceId: string, offsetData: any) {
    const topic = `${this.topicPrefix}${deviceId}/offset`;
    const payload = JSON.stringify(offsetData);
    this.publishWithRetry(topic, payload, { qos: 1 });
  }

  public publishWithRetry(topic: string, payload: string, options: mqtt.IClientPublishOptions, retries = 3) {
    this.client.publish(topic, payload, options, (err) => {
      if (err) {
        if (retries > 0) {
          this.logger.warn(`Failed to publish to topic ${topic}. Retrying... (${retries} retries left)`);
          setTimeout(() => this.publishWithRetry(topic, payload, options, retries - 1), 2000);
        } else {
          this.logger.error(`Failed to publish to topic ${topic} after multiple retries.`, err);
        }
      } else {
        this.logger.log(`Published to topic ${topic}`);
      }
    });
  }

  public subscribe(topic: string, callback: (topic: string, payload: Buffer) => void): void {
    this.client.subscribe(topic, { qos: 1 }, (err) => {
      if (!err) {
        this.logger.log(`Subscribed to topic ${topic}`);
        this.client.on('message', (t, p) => {
          if (t === topic) {
            callback(t, p);
          }
        });
      }
    });
  }

  public unsubscribe(topic: string): void {
    this.client.unsubscribe(topic, (err) => {
      if (!err) {
        this.logger.log(`Unsubscribed from topic ${topic}`);
      }
    });
  }
}
