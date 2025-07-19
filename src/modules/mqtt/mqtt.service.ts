import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { EventsGateway } from '../events/events.gateway';
import { SensorsService } from '../sensors/sensors.service';
import { DevicesService } from '../devices/devices.service';
import { Cache } from 'cache-manager';
import { SensorData } from '../sensors/entities/sensor-data.entity';
import { CalibrationRequestDto } from '../calibrations/dto/calibration-request.dto';
import { ThresholdRequestDto } from '../thresholds/dto/threshold-request.dto';
import {
  MqttBrokerUnavailableException,
  MqttPublishFailedException,
  MqttConnectionTimeoutException,
  InvalidDeviceIdFormatException,
  MqttPayloadValidationException,
  MqttOperationTimeoutException,
  MqttConfigurationException,
  MqttSubscriptionFailedException,
  MqttMessageHandlingException,
} from './exceptions/mqtt.exceptions';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private logger: Logger = new Logger('MqttService');
  private retryCount = 0;
  private topicPrefix: string;
  private lastConnectionTime: Date | undefined;
  private lastConnectionError: string | undefined;
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private messageDeliveryTracking: Map<
    string,
    { timestamp: Date; deviceId: string; operation: string }
  > = new Map();
  private publishMetrics = {
    totalAttempts: 0,
    successful: 0,
    failed: 0,
    totalLatency: 0,
  };
  private activeSubscriptions: string[] = [];
  private periodicTasksInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => SensorsService))
    private readonly sensorsService: SensorsService,
    private readonly devicesService: DevicesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.topicPrefix = this.configService.get<string>(
      'mqtt.topicPrefix',
      'simonair/',
    );
  }

  onModuleInit() {
    this.connect();

    // Start periodic cleanup and health monitoring
    this.startPeriodicTasks();
  }

  private connect() {
    try {
      const mqttConfig = this.configService.get('mqtt');

      // Validate MQTT configuration
      if (!mqttConfig) {
        throw new MqttConfigurationException(
          'mqtt',
          'MQTT configuration not found',
        );
      }

      if (!mqttConfig.brokerUrl) {
        throw new MqttConfigurationException(
          'brokerUrl',
          'MQTT broker URL not configured',
        );
      }

      if (!mqttConfig.clientId) {
        throw new MqttConfigurationException(
          'clientId',
          'MQTT client ID not configured',
        );
      }

      const connectUrl = mqttConfig.brokerUrl;
      const clientId = `${mqttConfig.clientId}-${Date.now()}`;

      this.logger.log('Attempting to connect to MQTT broker', {
        brokerUrl: connectUrl,
        clientId,
        reconnectAttempt: this.retryCount,
        timestamp: new Date().toISOString(),
      });

      this.client = mqtt.connect(connectUrl, {
        clientId,
        username: mqttConfig.username,
        password: mqttConfig.password,
        reconnectPeriod: 0, // Disable automatic reconnect to handle it manually
        connectTimeout: 5000,
        keepalive: 60,
        clean: true,
        will: {
          topic: `${this.topicPrefix}system/status`,
          payload: JSON.stringify({
            clientId,
            status: 'offline',
            timestamp: new Date().toISOString(),
          }),
          qos: 1,
          retain: true,
        },
      });

      // Enhanced connection event handling
      this.client.on('connect', (connack) => {
        this.lastConnectionTime = new Date();
        this.lastConnectionError = undefined;
        this.logger.log('Successfully connected to MQTT broker', {
          clientId,
          connectionTime: this.lastConnectionTime,
          reconnectAttempts: this.retryCount,
          sessionPresent: connack.sessionPresent,
          returnCode: connack.returnCode,
        });
        this.retryCount = 0; // Reset retry count on successful connection
        this.subscribeToTopics();

        // Publish online status
        this.publishSystemStatus('online', clientId);
      });

      // Enhanced error event handling
      this.client.on('error', (err: any) => {
        this.lastConnectionError = err.message;
        this.logger.error('MQTT Client Error occurred', {
          errorCode: err.code || 'UNKNOWN',
          errorMessage: err.message,
          errorName: err.name,
          reconnectAttempts: this.retryCount,
          brokerUrl: connectUrl,
          clientId,
          timestamp: new Date().toISOString(),
          stack: err.stack,
        });
        this.handleDisconnect(err.message);
      });

      // Enhanced close event handling
      this.client.on('close', () => {
        const uptime = this.lastConnectionTime
          ? Date.now() - this.lastConnectionTime.getTime()
          : 0;
        this.logger.warn('MQTT connection closed', {
          lastConnectionTime: this.lastConnectionTime,
          uptime,
          uptimeFormatted: this.formatUptime(uptime),
          clientId,
          timestamp: new Date().toISOString(),
        });
        this.handleDisconnect('Connection closed');
      });

      // Enhanced offline event handling
      this.client.on('offline', () => {
        this.logger.warn('MQTT client went offline', {
          lastConnectionTime: this.lastConnectionTime,
          clientId,
          timestamp: new Date().toISOString(),
        });
      });

      // Enhanced reconnect event handling
      this.client.on('reconnect', () => {
        this.logger.log('MQTT client attempting to reconnect', {
          reconnectAttempt: this.retryCount + 1,
          clientId,
          timestamp: new Date().toISOString(),
        });
      });

      // Enhanced message event handling with error catching
      this.client.on('message', (topic, payload, packet) => {
        try {
          this.handleMqttMessage(topic, payload);
        } catch (error) {
          this.logger.error('Error handling MQTT message', {
            topic,
            payloadSize: payload.length,
            messageId: packet.messageId,
            qos: packet.qos,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });

          // Don't throw here to prevent breaking the MQTT client
          // Instead, log the error and continue processing other messages
        }
      });

      // Handle packet receive events for debugging
      this.client.on('packetsend', (packet: any) => {
        this.logger.debug('MQTT packet sent', {
          cmd: packet.cmd,
          messageId: packet.messageId,
          topic: packet.topic || 'N/A',
          qos: packet.qos || 0,
        });
      });

      this.client.on('packetreceive', (packet: any) => {
        this.logger.debug('MQTT packet received', {
          cmd: packet.cmd,
          messageId: packet.messageId,
          topic: packet.topic || 'N/A',
          qos: packet.qos || 0,
        });
      });
    } catch (error) {
      this.logger.error('Failed to initialize MQTT connection', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      // Schedule retry for configuration errors too
      this.handleDisconnect(`Initialization failed: ${error.message}`);
    }
  }

  private handleDisconnect(reason?: string) {
    this.lastConnectionError = reason || 'Connection lost';

    if (this.retryCount >= 3) {
      this.logger.error(
        'MQTT connection failed after 3 retries. Please check the broker status.',
        {
          reason,
          totalRetries: this.retryCount,
          lastConnectionTime: this.lastConnectionTime,
        },
      );
      // In a real-world scenario, you might want to throw an exception or notify an admin.
      return;
    }

    this.retryCount++;
    const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
    this.logger.log(
      `Attempting to reconnect in ${delay / 1000} seconds (Attempt ${this.retryCount}/3)`,
      {
        reason,
        delay,
        retryCount: this.retryCount,
      },
    );

    setTimeout(() => this.connect(), delay);
  }

  /**
   * Enhanced subscription handling with comprehensive error handling and logging
   * Implements requirements 3.3, 3.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  private subscribeToTopics(): void {
    const subscriptions = [
      { topic: `${this.topicPrefix}+/data`, description: 'sensor data' },
      {
        topic: `${this.topicPrefix}+/calibrate/ack`,
        description: 'calibration acknowledgments',
      },
      {
        topic: `${this.topicPrefix}+/offset/ack`,
        description: 'threshold acknowledgments',
      },
    ];

    subscriptions.forEach(({ topic, description }) => {
      this.client.subscribe(topic, { qos: 1 }, (err: any, granted) => {
        if (err) {
          this.logger.error(
            `Failed to subscribe to ${description} topic: ${topic}`,
            {
              topic,
              description,
              error: err.message,
              errorCode: err.code || 'UNKNOWN',
              timestamp: new Date().toISOString(),
            },
          );

          // Don't throw here, just log the error and continue with other subscriptions
          return;
        }

        if (granted && granted.length > 0) {
          const grantedQos = granted[0].qos;
          this.activeSubscriptions.push(topic);

          this.logger.log(
            `Successfully subscribed to ${description} topic: ${topic}`,
            {
              topic,
              description,
              grantedQos,
              requestedQos: 1,
              timestamp: new Date().toISOString(),
            },
          );
        } else {
          this.logger.warn(
            `Subscription granted but no topics returned for ${description}`,
            {
              topic,
              description,
              granted,
            },
          );
        }
      });
    });

    // Log subscription summary
    this.logger.log(
      `Initiated ${subscriptions.length} MQTT topic subscriptions`,
      {
        subscriptionCount: subscriptions.length,
        topics: subscriptions.map((s) => s.topic),
        timestamp: new Date().toISOString(),
      },
    );
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
      this.logger.log(`Offset ACK received for device ${deviceId}`);
    } else {
      this.logger.warn(`Unhandled topic: ${topic}`);
    }
  }

  /**
   * Enhanced sensor data message handling with comprehensive validation
   * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
   */
  private async handleSensorDataMessage(deviceId: string, payload: Buffer) {
    const startTime = Date.now();
    const lastMessageTimestamp = await this.cacheManager.get<number>(
      `last_message_${deviceId}`,
    );
    const now = Date.now();

    // Throttle messages to prevent spam (1 message every 10 seconds)
    if (lastMessageTimestamp && now - lastMessageTimestamp < 10000) {
      this.logger.warn(`Throttling message for device ${deviceId}`, {
        deviceId,
        lastMessageTime: new Date(lastMessageTimestamp),
        throttleInterval: 10000,
      });
      return;
    }

    let rawData: any;
    let validatedData: Partial<SensorData>;

    try {
      // Parse JSON payload with enhanced error handling
      rawData = JSON.parse(payload.toString());
      this.logger.debug(`Received sensor data for device ${deviceId}`, {
        deviceId,
        payloadSize: payload.length,
        rawData,
      });
    } catch (error) {
      this.logger.error(
        `Failed to parse JSON payload for device ${deviceId}: ${payload.toString()}`,
        {
          deviceId,
          payloadSize: payload.length,
          error: error.message,
          rawPayload: payload.toString(),
        },
      );
      return;
    }

    try {
      // Enhanced sensor data validation (Requirement 4.2)
      validatedData = await this.validateAndProcessSensorData(
        deviceId,
        rawData,
      );
    } catch (error) {
      this.logger.error(
        `Sensor data validation failed for device ${deviceId}`,
        {
          deviceId,
          error: error.message,
          rawData,
        },
      );
      return;
    }

    try {
      // Validate device exists and is active (Requirement 4.1)
      await this.devicesService.validateDevice(deviceId);
    } catch (error) {
      this.logger.warn(
        `Device validation failed for ${deviceId}: ${error.message}`,
        {
          deviceId,
          error: error.message,
        },
      );
      return;
    }

    try {
      await this.devicesService.updateLastSeen(deviceId);

      // Forward raw validated data to WebSocket immediately for real-time updates
      this.eventsGateway.broadcastRealtime(deviceId, validatedData);

      // Process and save data to database
      await this.sensorsService.processAndSaveData(deviceId, validatedData);

      await this.cacheManager.set(`last_message_${deviceId}`, now, 10);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Successfully processed sensor data for device ${deviceId}`,
        {
          deviceId,
          processingTime,
          dataPoints: Object.keys(validatedData).length,
          timestamp: validatedData.timestamp,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to process sensor data for device ${deviceId}`,
        {
          deviceId,
          error: error.message,
          stack: error.stack,
          validatedData,
        },
      );
    }
  }

  /**
   * Enhanced sensor data validation with timestamp and status field processing
   * Implements requirements 4.2, 4.3, 4.6, 4.7, 4.8
   */
  private async validateAndProcessSensorData(
    deviceId: string,
    rawData: any,
  ): Promise<Partial<SensorData>> {
    // Basic structure validation (Requirement 4.2)
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Sensor data must be a valid JSON object');
    }

    const validatedData: Partial<SensorData> = {};

    // Validate and process timestamp (Requirement 4.3)
    if (rawData.timestamp) {
      const timestamp = this.validateISO8601Timestamp(rawData.timestamp);
      if (!timestamp) {
        throw new Error(
          `Invalid timestamp format: ${rawData.timestamp}. Expected ISO 8601 UTC format`,
        );
      }
      validatedData.timestamp = timestamp;
    } else {
      // Use current timestamp if not provided
      validatedData.timestamp = new Date();
      this.logger.warn(
        `No timestamp provided for device ${deviceId}, using current time`,
        {
          deviceId,
          generatedTimestamp: validatedData.timestamp,
        },
      );
    }

    // Process multiple sensor readings in order of timestamp (Requirement 4.8)
    if (Array.isArray(rawData.readings)) {
      this.logger.debug(
        `Processing multiple sensor readings for device ${deviceId}`,
        {
          deviceId,
          readingCount: rawData.readings.length,
        },
      );

      // Sort readings by timestamp if multiple readings are provided
      const sortedReadings = rawData.readings.sort((a: any, b: any) => {
        const timestampA = new Date(a.timestamp || validatedData.timestamp);
        const timestampB = new Date(b.timestamp || validatedData.timestamp);
        return timestampA.getTime() - timestampB.getTime();
      });

      // Process each reading in chronological order
      for (const reading of sortedReadings) {
        await this.processIndividualReading(
          deviceId,
          reading,
          validatedData.timestamp,
        );
      }

      // Use the latest reading for the main response
      const latestReading = sortedReadings[sortedReadings.length - 1];
      return this.validateSingleReading(
        deviceId,
        latestReading,
        validatedData.timestamp,
      );
    }

    // Process single reading
    return this.validateSingleReading(
      deviceId,
      rawData,
      validatedData.timestamp,
    );
  }

  /**
   * Validate and process a single sensor reading
   * Implements requirements 4.2, 4.6, 4.7
   * Updated to handle new IoT device format
   */
  private validateSingleReading(
    deviceId: string,
    rawData: any,
    timestamp: Date,
  ): Partial<SensorData> {
    const validatedData: Partial<SensorData> = { timestamp };

    // Validate and process sensor readings with status fields (Requirement 4.7)
    // For new format, the status is embedded in the sensor object
    validatedData.temperature = this.processSensorReadingWithStatus(
      rawData,
      'temperature',
      'temp_status', // This won't be used for new format but kept for backward compatibility
    );
    validatedData.ph = this.processSensorReadingWithStatus(
      rawData,
      'ph',
      'ph_status',
    );
    validatedData.tds = this.processSensorReadingWithStatus(
      rawData,
      'tds',
      'tds_status',
    );

    // Handle DO field mapping (do -> do_level for entity compatibility)
    if (rawData.do !== undefined) {
      validatedData.do_level = this.processSensorReadingWithStatus(
        rawData,
        'do',
        'do_status',
      );
    } else if (rawData.do_level !== undefined) {
      validatedData.do_level = this.processSensorReadingWithStatus(
        rawData,
        'do_level',
        'do_status',
      );
    }

    // Remove undefined fields
    Object.keys(validatedData).forEach((key) => {
      if (validatedData[key] === undefined) {
        delete validatedData[key];
      }
    });

    // Ensure at least one sensor reading is present (Requirement 4.6)
    const sensorReadings = ['temperature', 'ph', 'tds', 'do_level'].filter(
      (field) => validatedData[field] !== undefined,
    );
    if (sensorReadings.length === 0) {
      throw new Error(
        'At least one sensor reading (temperature, ph, tds, do) must be provided',
      );
    }

    this.logger.debug(`Validated sensor data for device ${deviceId}`, {
      deviceId,
      validatedFields: Object.keys(validatedData),
      timestamp: validatedData.timestamp,
      sensorCount: sensorReadings.length,
    });

    return validatedData;
  }

  /**
   * Process individual reading for multiple readings scenario
   * Implements requirement 4.8
   */
  private async processIndividualReading(
    deviceId: string,
    reading: any,
    baseTimestamp: Date,
  ): Promise<void> {
    try {
      // Use reading-specific timestamp if provided, otherwise use base timestamp
      const readingTimestamp = reading.timestamp
        ? this.validateISO8601Timestamp(reading.timestamp) || baseTimestamp
        : baseTimestamp;

      const validatedReading = this.validateSingleReading(
        deviceId,
        reading,
        readingTimestamp,
      );

      // Process and save individual reading
      await this.sensorsService.processAndSaveData(deviceId, validatedReading);

      this.logger.debug(`Processed individual reading for device ${deviceId}`, {
        deviceId,
        timestamp: readingTimestamp,
        sensorFields: Object.keys(validatedReading).filter(
          (k) => k !== 'timestamp',
        ),
      });
    } catch (error) {
      this.logger.error(
        `Failed to process individual reading for device ${deviceId}`,
        {
          deviceId,
          reading,
          error: error.message,
        },
      );
      // Continue processing other readings even if one fails
    }
  }

  /**
   * Validate ISO 8601 timestamp format
   * Implements requirement 4.3
   */
  private validateISO8601Timestamp(timestampStr: string): Date | null {
    try {
      // Check if the string matches ISO 8601 format including timezone offset
      const iso8601Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;
      if (!iso8601Regex.test(timestampStr)) {
        return null;
      }

      const timestamp = new Date(timestampStr);

      // Check if the date is valid
      if (isNaN(timestamp.getTime())) {
        return null;
      }

      // Check if timestamp is not too far in the future (max 1 hour ahead)
      const now = new Date();
      const maxFutureTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      if (timestamp > maxFutureTime) {
        throw new Error(`Timestamp is too far in the future: ${timestampStr}`);
      }

      // Check if timestamp is not too old (max 24 hours ago)
      const minPastTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
      if (timestamp < minPastTime) {
        this.logger.warn(`Timestamp is quite old: ${timestampStr}`, {
          timestamp: timestampStr,
          age: now.getTime() - timestamp.getTime(),
        });
      }

      return timestamp;
    } catch (error) {
      this.logger.error(`Timestamp validation error: ${error.message}`, {
        timestamp: timestampStr,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Process individual sensor reading with status field
   * Implements requirement 4.7
   */
  private processSensorReading(
    rawData: any,
    validatedData: Partial<SensorData>,
    valueField: string,
    statusField: string,
  ): void {
    if (rawData[valueField] !== undefined && rawData[valueField] !== null) {
      const value = parseFloat(rawData[valueField]);
      if (!isNaN(value)) {
        validatedData[valueField] = value;

        // Process status field if provided (GOOD/BAD)
        if (rawData[statusField]) {
          const status = rawData[statusField].toString().toUpperCase();
          if (status === 'GOOD' || status === 'BAD') {
            validatedData[statusField] = status;
          } else {
            this.logger.warn(
              `Invalid status value for ${statusField}: ${rawData[statusField]}. Expected GOOD or BAD`,
              {
                field: statusField,
                value: rawData[statusField],
              },
            );
          }
        }
      } else {
        this.logger.warn(
          `Invalid numeric value for ${valueField}: ${rawData[valueField]}`,
          {
            field: valueField,
            value: rawData[valueField],
          },
        );
      }
    }
  }

  /**
   * Process sensor reading with status field and return structured data
   * Implements requirement 4.7 - compatible with SensorData entity structure
   * Updated to handle new IoT device format: {"value": number, "status": string} or {"raw": number, "voltage": number, "calibrated": number, "calibrated_ok": boolean, "status": string}
   * Device already provides calibrated data, so we preserve all device-provided values
   */
  private processSensorReadingWithStatus(
    rawData: any,
    valueField: string,
    statusField: string,
  ): any | undefined {
    // Handle new IoT device format where sensor data is an object
    if (rawData[valueField] && typeof rawData[valueField] === 'object') {
      const sensorData = rawData[valueField];

      // Device provides complete sensor data, preserve all fields as-is
      const sensorReading: any = {};

      // Copy all fields from device data
      if (sensorData.raw !== undefined) {
        sensorReading.raw = parseFloat(sensorData.raw);
      }
      
      if (sensorData.value !== undefined) {
        sensorReading.value = parseFloat(sensorData.value);
      }
      
      if (sensorData.voltage !== undefined) {
        sensorReading.voltage = parseFloat(sensorData.voltage);
      }
      
      if (sensorData.calibrated !== undefined) {
        sensorReading.calibrated = parseFloat(sensorData.calibrated);
      }
      
      if (sensorData.calibrated_ok !== undefined) {
        sensorReading.calibrated_ok = Boolean(sensorData.calibrated_ok);
      }
      
      if (sensorData.status !== undefined) {
        const status = sensorData.status.toString().toUpperCase();
        if (status === 'GOOD' || status === 'BAD') {
          sensorReading.status = status;
        }
      }

      // Ensure we have at least one valid numeric value
      const hasValidValue = !isNaN(sensorReading.raw) || 
                           !isNaN(sensorReading.value) || 
                           !isNaN(sensorReading.calibrated);

      if (hasValidValue) {
        return sensorReading;
      } else {
        this.logger.warn(
          `No valid numeric value found for ${valueField}: ${JSON.stringify(sensorData)}`,
          {
            field: valueField,
            value: sensorData,
          },
        );
      }
    }
    // Handle legacy format where sensor data is a direct number
    else if (
      rawData[valueField] !== undefined &&
      rawData[valueField] !== null
    ) {
      const value = parseFloat(rawData[valueField]);
      if (!isNaN(value)) {
        const sensorReading: any = {
          raw: value,
          value: value,
        };

        // Process status field if provided (GOOD/BAD)
        if (rawData[statusField]) {
          const status = rawData[statusField].toString().toUpperCase();
          if (status === 'GOOD' || status === 'BAD') {
            sensorReading.status = status;
          } else {
            this.logger.warn(
              `Invalid status value for ${statusField}: ${rawData[statusField]}. Expected GOOD or BAD`,
              {
                field: statusField,
                value: rawData[statusField],
              },
            );
          }
        }

        // Handle voltage field if present (for TDS and DO sensors)
        if (rawData[`${valueField}_voltage`] !== undefined) {
          const voltage = parseFloat(rawData[`${valueField}_voltage`]);
          if (!isNaN(voltage)) {
            sensorReading.voltage = voltage;
          }
        }

        return sensorReading;
      } else {
        this.logger.warn(
          `Invalid numeric value for ${valueField}: ${rawData[valueField]}`,
          {
            field: valueField,
            value: rawData[valueField],
          },
        );
      }
    }

    return undefined;
  }

  private handleCalibrationAckMessage(deviceId: string, payload: Buffer) {
    this.logger.log(`Calibration ACK received for device ${deviceId}`);
    try {
      const ack = JSON.parse(payload.toString());
      this.eventsGateway.sendToRoom(
        `device:${deviceId}`,
        'calibrationAck',
        ack,
      );
    } catch (error) {
      this.logger.error(
        `Failed to parse calibration ACK for device ${deviceId}: ${payload.toString()}`,
        error.stack,
      );
    }
  }

  private isValidSensorPayload(payload: any): payload is Partial<SensorData> {
    return ['timestamp', 'temperature', 'ph', 'tds', 'do'].every(
      (key) => key in payload,
    );
  }

  publishCalibration(deviceId: string, calibrationData: any) {
    const topic = `${this.topicPrefix}${deviceId}/calibration`;
    const payload = JSON.stringify(calibrationData);
    this.publishWithRetry(topic, payload, { qos: 1 });
  }

  /**
   * Enhanced calibration publishing with validation and proper error handling
   * Formats calibration data according to SIMONAIR protocol
   */
  async publishCalibrationWithValidation(
    deviceId: string,
    calibrationRequest: CalibrationRequestDto,
  ): Promise<void> {
    try {
      if (!this.isValidDeviceId(deviceId)) {
        throw new InvalidDeviceIdFormatException(deviceId);
      }

      this.validateCalibrationPayload(calibrationRequest);

      // Format calibration data according to SIMONAIR protocol
      const formattedPayload = this.formatCalibrationForSIMONAIR(
        calibrationRequest.sensor_type,
        calibrationRequest.calibration_data,
      );

      const topic = `${this.topicPrefix}${deviceId}/calibration`;
      const payload = JSON.stringify(formattedPayload);

      this.logger.log(
        `Publishing calibration for device ${deviceId}, sensor: ${calibrationRequest.sensor_type}`,
      );
      this.logger.debug(`Calibration payload: ${payload}`);

      // Validate MQTT connection before publishing
      if (!this.client || !this.client.connected) {
        throw new MqttBrokerUnavailableException(
          deviceId,
          'MQTT client is not connected',
        );
      }

      // Publish with enhanced retry logic and error handling
      await this.publishCalibrationWithRetry(
        topic,
        payload,
        deviceId,
        calibrationRequest.sensor_type,
      );

      this.logger.log(
        `Successfully published calibration for device ${deviceId}, sensor: ${calibrationRequest.sensor_type}`,
      );
    } catch (error) {
      // Re-throw custom MQTT exceptions as-is
      if (
        error instanceof InvalidDeviceIdFormatException ||
        error instanceof MqttBrokerUnavailableException ||
        error instanceof MqttPayloadValidationException ||
        error instanceof MqttPublishFailedException
      ) {
        throw error;
      }

      // Wrap other errors in MQTT-specific exceptions
      this.logger.error(
        `Failed to publish calibration for device ${deviceId}, sensor: ${calibrationRequest.sensor_type}`,
        error.stack,
      );
      throw new MqttPublishFailedException(
        deviceId,
        `${this.topicPrefix}${deviceId}/calibration`,
        error.message,
      );
    }
  }

  /**
   * Validate calibration payload before publishing
   */
  private validateCalibrationPayload(
    calibrationRequest: CalibrationRequestDto,
  ): void {
    const { sensor_type, calibration_data } = calibrationRequest;

    if (!sensor_type || !calibration_data) {
      throw new MqttPayloadValidationException(
        'unknown',
        'Sensor type and calibration data are required',
      );
    }

    switch (sensor_type) {
      case 'ph':
        if (
          calibration_data.m === undefined ||
          calibration_data.c === undefined
        ) {
          throw new MqttPayloadValidationException(
            'ph',
            'pH calibration requires m (slope) and c (intercept) values',
          );
        }
        if (
          typeof calibration_data.m !== 'number' ||
          typeof calibration_data.c !== 'number'
        ) {
          throw new MqttPayloadValidationException(
            'ph',
            'pH calibration m and c values must be numbers',
          );
        }
        break;

      case 'tds':
        if (
          calibration_data.v === undefined ||
          calibration_data.std === undefined ||
          calibration_data.t === undefined
        ) {
          throw new MqttPayloadValidationException(
            'tds',
            'TDS calibration requires v (voltage), std (standard), and t (temperature) values',
          );
        }
        if (
          typeof calibration_data.v !== 'number' ||
          typeof calibration_data.std !== 'number' ||
          typeof calibration_data.t !== 'number'
        ) {
          throw new MqttPayloadValidationException(
            'tds',
            'TDS calibration v, std, and t values must be numbers',
          );
        }
        break;

      case 'do': {
        const isSingle =
          calibration_data.v !== undefined && calibration_data.t !== undefined;

        const isDouble =
          calibration_data.v1 !== undefined &&
          calibration_data.t1 !== undefined &&
          calibration_data.v2 !== undefined &&
          calibration_data.t2 !== undefined;

        if (!isSingle && !isDouble) {
          throw new MqttPayloadValidationException(
            'do',
            'DO calibration requires either single-point (v, t) or double-point (v1, t1, v2, t2) values',
          );
        }

        if (isSingle) {
          if (
            typeof calibration_data.v !== 'number' ||
            typeof calibration_data.t !== 'number'
          ) {
            throw new MqttPayloadValidationException(
              'do',
              'DO single-point calibration values (v, t) must be numbers',
            );
          }
        }

        if (isDouble) {
          if (
            typeof calibration_data.v1 !== 'number' ||
            typeof calibration_data.t1 !== 'number' ||
            typeof calibration_data.v2 !== 'number' ||
            typeof calibration_data.t2 !== 'number'
          ) {
            throw new MqttPayloadValidationException(
              'do',
              'DO double-point calibration values (v1, t1, v2, t2) must be numbers',
            );
          }
        }

        break;
      }

      default:
        throw new MqttPayloadValidationException(
          'unknown',
          `Unsupported sensor type: ${sensor_type}`,
        );
    }
  }

  /**
   * Format calibration data according to SIMONAIR protocol specification
   */
  private formatCalibrationForSIMONAIR(
    sensorType: string,
    calibrationData: Record<string, any>,
  ): Record<string, any> {
    const formattedData: Record<string, any> = {};

    switch (sensorType) {
      case 'ph':
        formattedData.ph = {
          m: calibrationData.m,
          c: calibrationData.c,
        };
        break;

      case 'tds':
        formattedData.tds = {
          v: calibrationData.v,
          std: calibrationData.std,
          t: calibrationData.t,
        };
        break;

      case 'do': {
        const isSingle = 'v' in calibrationData && 't' in calibrationData;
        const isDouble =
          'v1' in calibrationData &&
          't1' in calibrationData &&
          'v2' in calibrationData &&
          't2' in calibrationData;

        if (isSingle) {
          formattedData.do = {
            mode: 'single',
            v1: calibrationData.v,
            t1: calibrationData.t,
          };
        } else if (isDouble) {
          formattedData.do = {
            mode: 'double',
            v1: calibrationData.v1,
            t1: calibrationData.t1,
            v2: calibrationData.v2,
            t2: calibrationData.t2,
          };
        } else {
          throw new Error('Invalid DO calibration format');
        }

        break;
      }

      default:
        throw new Error(
          `Unsupported sensor type for calibration: ${sensorType}`,
        );
    }

    return formattedData;
  }

  /**
   * Enhanced publish method with calibration-specific retry logic and logging
   * Includes timeout handling and message delivery tracking
   */
  private async publishCalibrationWithRetry(
    topic: string,
    payload: string,
    deviceId: string,
    sensorType: string,
    retries: number = 3,
  ): Promise<void> {
    const startTime = Date.now();
    const trackingId = this.trackMessageDelivery(
      deviceId,
      `calibration-${sensorType}`,
    );

    const publishOperation = new Promise<void>((resolve, reject) => {
      const attemptPublish = (attemptsLeft: number) => {
        this.client.publish(topic, payload, { qos: 1 }, (err) => {
          const latency = Date.now() - startTime;

          if (err) {
            this.updatePublishMetrics(false, latency);
            this.logger.warn(
              `Failed to publish calibration for device ${deviceId}, sensor ${sensorType} to topic ${topic}. ` +
                `Error: ${err.message}. Attempts left: ${attemptsLeft}`,
              {
                deviceId,
                sensorType,
                topic,
                attemptsLeft,
                errorCode: (err as any).code || 'UNKNOWN',
                errorMessage: err.message,
                trackingId,
                latency,
              },
            );

            if (attemptsLeft > 0) {
              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, 3 - attemptsLeft) * 1000;
              setTimeout(() => attemptPublish(attemptsLeft - 1), delay);
            } else {
              this.logger.error(
                `Failed to publish calibration for device ${deviceId}, sensor ${sensorType} after ${retries} retries`,
                {
                  deviceId,
                  sensorType,
                  topic,
                  totalRetries: retries,
                  errorCode: (err as any).code || 'UNKNOWN',
                  errorMessage: err.message,
                  stack: err.stack,
                  trackingId,
                  totalLatency: latency,
                },
              );
              reject(
                new MqttPublishFailedException(
                  deviceId,
                  topic,
                  `${err.message} (after ${retries} retries)`,
                ),
              );
            }
          } else {
            this.updatePublishMetrics(true, latency);
            this.logger.log(
              `Successfully published calibration for device ${deviceId}, sensor ${sensorType} to topic ${topic}`,
              {
                deviceId,
                sensorType,
                topic,
                payloadSize: payload.length,
                retriesUsed: retries - attemptsLeft,
                trackingId,
                latency,
              },
            );
            resolve();
          }
        });
      };

      attemptPublish(retries);
    });

    // Apply timeout handling (30 seconds for calibration operations)
    return this.withTimeout(
      publishOperation,
      30000,
      deviceId,
      `calibration-${sensorType}`,
    );
  }

  /**
   * Enhanced threshold publishing with validation and proper error handling
   * Transforms min/max thresholds to good/bad format according to SIMONAIR protocol
   */
  async publishThresholdsWithValidation(
    deviceId: string,
    thresholdRequest: ThresholdRequestDto,
  ): Promise<void> {
    try {
      if (!this.isValidDeviceId(deviceId)) {
        throw new InvalidDeviceIdFormatException(deviceId);
      }
      this.validateThresholdPayload(thresholdRequest);

      const formattedPayload =
        this.formatThresholdsForSIMONAIR(thresholdRequest);

      if (Object.keys(formattedPayload.threshold).length === 0) {
        this.logger.warn(
          `No valid threshold values provided for device ${deviceId}, skipping MQTT publish`,
        );
        return;
      }

      const topic = `${this.topicPrefix}${deviceId}/offset`;
      const payload = JSON.stringify(thresholdRequest);

      this.logger.log(`Publishing thresholds for device ${deviceId}`);
      this.logger.debug(`Threshold payload: ${payload}`);

      if (!this.client || !this.client.connected) {
        throw new MqttBrokerUnavailableException(
          deviceId,
          'MQTT client is not connected',
        );
      }

      await this.publishThresholdsWithRetry(topic, payload, deviceId);

      this.logger.log(
        `Successfully published thresholds for device ${deviceId}`,
      );
    } catch (error) {
      if (
        error instanceof InvalidDeviceIdFormatException ||
        error instanceof MqttBrokerUnavailableException ||
        error instanceof MqttPayloadValidationException ||
        error instanceof MqttPublishFailedException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to publish thresholds for device ${deviceId}`,
        error.stack,
      );
      throw new MqttPublishFailedException(
        deviceId,
        `${this.topicPrefix}${deviceId}/offset`,
        error.message,
      );
    }
  }

  /**
   * Validate threshold payload before publishing
   */
  private validateThresholdPayload(
    thresholdRequest: ThresholdRequestDto,
  ): void {
    // Check if at least one threshold value is provided
    const hasAnyThreshold = Object.values(thresholdRequest).some(
      (value) => value !== undefined && value !== null && value !== '',
    );

    if (!hasAnyThreshold) {
      throw new MqttPayloadValidationException(
        'unknown',
        'At least one threshold value must be provided',
      );
    }

    // Validate numeric format for provided values
    const validateNumericField = (
      fieldName: string,
      value: string | undefined,
    ) => {
      if (value !== undefined && value !== null && value !== '') {
        if (isNaN(parseFloat(value))) {
          throw new MqttPayloadValidationException(
            'unknown',
            `${fieldName} must be a valid numeric value`,
          );
        }
      }
    };

    validateNumericField('ph_min', thresholdRequest.ph_min);
    validateNumericField('ph_max', thresholdRequest.ph_max);
    validateNumericField('tds_min', thresholdRequest.tds_min);
    validateNumericField('tds_max', thresholdRequest.tds_max);
    validateNumericField('do_min', thresholdRequest.do_min);
    validateNumericField('do_max', thresholdRequest.do_max);
    validateNumericField('temp_min', thresholdRequest.temp_min);
    validateNumericField('temp_max', thresholdRequest.temp_max);

    // Validate min/max pairs if both are provided
    const validateMinMaxPair = (
      minValue: string | undefined,
      maxValue: string | undefined,
      fieldType: string,
    ) => {
      if (minValue && maxValue) {
        const min = parseFloat(minValue);
        const max = parseFloat(maxValue);
        if (min >= max) {
          throw new MqttPayloadValidationException(
            'unknown',
            `${fieldType} minimum must be less than ${fieldType} maximum`,
          );
        }
      }
    };

    validateMinMaxPair(thresholdRequest.ph_min, thresholdRequest.ph_max, 'pH');
    validateMinMaxPair(
      thresholdRequest.tds_min,
      thresholdRequest.tds_max,
      'TDS',
    );
    validateMinMaxPair(thresholdRequest.do_min, thresholdRequest.do_max, 'DO');
    validateMinMaxPair(
      thresholdRequest.temp_min,
      thresholdRequest.temp_max,
      'Temperature',
    );
  }

  /**
   * Transform threshold data from min/max format to good/bad format according to SIMONAIR protocol
   * Filters out empty/null threshold fields
   */
  private formatThresholdsForSIMONAIR(thresholdData: ThresholdRequestDto): {
    threshold: Record<string, number>;
  } {
    const formattedThresholds: Record<string, number> = {};

    // pH thresholds: min becomes good, max becomes bad
    if (this.isValidThresholdValue(thresholdData.ph_min)) {
      formattedThresholds.ph_good = parseFloat(thresholdData.ph_min!);
    }
    if (this.isValidThresholdValue(thresholdData.ph_max)) {
      formattedThresholds.ph_bad = parseFloat(thresholdData.ph_max!);
    }

    // TDS thresholds: min becomes good, max becomes bad
    if (this.isValidThresholdValue(thresholdData.tds_min)) {
      formattedThresholds.tds_good = parseFloat(thresholdData.tds_min!);
    }
    if (this.isValidThresholdValue(thresholdData.tds_max)) {
      formattedThresholds.tds_bad = parseFloat(thresholdData.tds_max!);
    }

    // DO thresholds: min becomes good, max becomes bad
    if (this.isValidThresholdValue(thresholdData.do_min)) {
      formattedThresholds.do_good = parseFloat(thresholdData.do_min!);
    }
    if (this.isValidThresholdValue(thresholdData.do_max)) {
      formattedThresholds.do_bad = parseFloat(thresholdData.do_max!);
    }

    // Temperature thresholds: min becomes temp_low, max becomes temp_high
    if (this.isValidThresholdValue(thresholdData.temp_min)) {
      formattedThresholds.temp_low = parseFloat(thresholdData.temp_min!);
    }
    if (this.isValidThresholdValue(thresholdData.temp_max)) {
      formattedThresholds.temp_high = parseFloat(thresholdData.temp_max!);
    }

    return { threshold: formattedThresholds };
  }

  /**
   * Check if a threshold value is valid (not null, undefined, or empty string)
   */
  private isValidThresholdValue(value: string | undefined | null): boolean {
    return (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !isNaN(parseFloat(value))
    );
  }

  /**
   * Enhanced publish method with threshold-specific retry logic and logging
   * Includes timeout handling and message delivery tracking
   */
  private async publishThresholdsWithRetry(
    topic: string,
    payload: string,
    deviceId: string,
    retries: number = 3,
  ): Promise<void> {
    const startTime = Date.now();
    const trackingId = this.trackMessageDelivery(deviceId, 'thresholds');

    const publishOperation = new Promise<void>((resolve, reject) => {
      const attemptPublish = (attemptsLeft: number) => {
        this.client.publish(topic, payload, { qos: 1 }, (err) => {
          const latency = Date.now() - startTime;

          if (err) {
            this.updatePublishMetrics(false, latency);
            this.logger.warn(
              `Failed to publish thresholds for device ${deviceId} to topic ${topic}. ` +
                `Error: ${err.message}. Attempts left: ${attemptsLeft}`,
              {
                deviceId,
                topic,
                attemptsLeft,
                errorCode: (err as any).code || 'UNKNOWN',
                errorMessage: err.message,
                trackingId,
                latency,
              },
            );

            if (attemptsLeft > 0) {
              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, 3 - attemptsLeft) * 1000;
              setTimeout(() => attemptPublish(attemptsLeft - 1), delay);
            } else {
              this.logger.error(
                `Failed to publish thresholds for device ${deviceId} after ${retries} retries`,
                {
                  deviceId,
                  topic,
                  totalRetries: retries,
                  errorCode: (err as any).code || 'UNKNOWN',
                  errorMessage: err.message,
                  stack: err.stack,
                  trackingId,
                  totalLatency: latency,
                },
              );
              reject(
                new MqttPublishFailedException(
                  deviceId,
                  topic,
                  `${err.message} (after ${retries} retries)`,
                ),
              );
            }
          } else {
            this.updatePublishMetrics(true, latency);
            this.logger.log(
              `Successfully published thresholds for device ${deviceId} to topic ${topic}`,
              {
                deviceId,
                topic,
                payloadSize: payload.length,
                retriesUsed: retries - attemptsLeft,
                trackingId,
                latency,
              },
            );
            resolve();
          }
        });
      };

      attemptPublish(retries);
    });

    // Apply timeout handling (30 seconds for threshold operations)
    return this.withTimeout(publishOperation, 30000, deviceId, 'thresholds');
  }

  /**
   * Validate device ID format according to SIMONAIR specification
   */
  private isValidDeviceId(deviceId: string): boolean {
    // SIMONAIR device ID format: SMNR-XXXX (where XXXX is alphanumeric)
    const deviceIdPattern = /^SMNR-[A-Z0-9]{4}$/i;
    return deviceIdPattern.test(deviceId);
  }

  /**
   * Enhanced MQTT connection validation with detailed health status
   * Implements requirement 3.1, 3.3, 3.4, 3.6
   */
  async validateMqttConnection(): Promise<{
    isConnected: boolean;
    status: 'healthy' | 'unhealthy' | 'reconnecting' | 'failed';
    details: {
      clientInitialized: boolean;
      brokerConnected: boolean;
      lastConnectionTime?: Date;
      reconnectAttempts: number;
      lastError?: string;
      uptime?: number;
      nextReconnectAttempt?: Date;
      connectionStability: 'stable' | 'unstable' | 'unknown';
    };
  }> {
    try {
      const clientInitialized = !!this.client;
      const brokerConnected = this.client?.connected || false;
      const reconnectAttempts = this.retryCount;

      let status: 'healthy' | 'unhealthy' | 'reconnecting' | 'failed' =
        'unhealthy';
      let connectionStability: 'stable' | 'unstable' | 'unknown' = 'unknown';

      if (clientInitialized && brokerConnected) {
        status = 'healthy';
        // Consider connection stable if it's been up for more than 5 minutes
        const uptime = this.lastConnectionTime
          ? Date.now() - this.lastConnectionTime.getTime()
          : 0;
        connectionStability = uptime > 300000 ? 'stable' : 'unstable';
      } else if (reconnectAttempts > 0 && reconnectAttempts < 3) {
        status = 'reconnecting';
        connectionStability = 'unstable';
      } else if (reconnectAttempts >= 3) {
        status = 'failed';
        connectionStability = 'unstable';
      }

      // Calculate next reconnect attempt time if reconnecting
      let nextReconnectAttempt: Date | undefined;
      if (status === 'reconnecting' || status === 'failed') {
        const delay = Math.pow(2, this.retryCount + 1) * 1000;
        nextReconnectAttempt = new Date(Date.now() + delay);
      }

      const connectionDetails = {
        clientInitialized,
        brokerConnected,
        lastConnectionTime: this.lastConnectionTime,
        reconnectAttempts,
        lastError: this.lastConnectionError,
        uptime: this.lastConnectionTime
          ? Date.now() - this.lastConnectionTime.getTime()
          : undefined,
        nextReconnectAttempt,
        connectionStability,
      };

      this.logger.debug('MQTT connection health check', {
        status,
        ...connectionDetails,
      });

      return {
        isConnected: brokerConnected,
        status,
        details: connectionDetails,
      };
    } catch (error) {
      this.logger.error('Error validating MQTT connection', error.stack);
      return {
        isConnected: false,
        status: 'failed',
        details: {
          clientInitialized: false,
          brokerConnected: false,
          reconnectAttempts: this.retryCount,
          lastError: error.message,
          connectionStability: 'unstable',
        },
      };
    }
  }

  /**
   * Force reconnection to MQTT broker
   * Implements requirement 3.3, 3.4
   */
  async forceReconnect(): Promise<void> {
    this.logger.log('Forcing MQTT reconnection');

    try {
      if (this.client) {
        this.client.end(true); // Force close connection
      }
    } catch (error) {
      this.logger.warn('Error closing existing MQTT connection', error.message);
    }

    // Reset retry count for forced reconnection
    this.retryCount = 0;
    this.lastConnectionError = 'Manual reconnection requested';

    // Initiate new connection
    this.connect();
  }

  /**
   * Check message delivery confirmation status
   * Implements requirement 3.4, 3.6
   */
  getMessageDeliveryStatus(trackingId: string): {
    found: boolean;
    details?: {
      timestamp: Date;
      deviceId: string;
      operation: string;
      age: number;
    };
  } {
    const trackingData = this.messageDeliveryTracking.get(trackingId);

    if (!trackingData) {
      return { found: false };
    }

    return {
      found: true,
      details: {
        ...trackingData,
        age: Date.now() - trackingData.timestamp.getTime(),
      },
    };
  }

  /**
   * Get all pending message deliveries
   * Implements requirement 3.4, 3.6
   */
  getPendingMessageDeliveries(): Array<{
    trackingId: string;
    timestamp: Date;
    deviceId: string;
    operation: string;
    age: number;
  }> {
    const now = Date.now();
    return Array.from(this.messageDeliveryTracking.entries()).map(
      ([trackingId, data]) => ({
        trackingId,
        ...data,
        age: now - data.timestamp.getTime(),
      }),
    );
  }

  /**
   * Clean up old message delivery tracking entries
   * Implements requirement 3.4, 3.6
   */
  private cleanupMessageDeliveryTracking(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [trackingId, data] of this.messageDeliveryTracking.entries()) {
      if (now - data.timestamp.getTime() > maxAge) {
        this.messageDeliveryTracking.delete(trackingId);
      }
    }
  }

  publishOffset(deviceId: string, offsetData: any) {
    const topic = `${this.topicPrefix}${deviceId}/offset`;
    const payload = JSON.stringify(offsetData);
    this.publishWithRetry(topic, payload, { qos: 1 });
  }

  public async publishWithRetry(
    topic: string,
    payload: string,
    options: mqtt.IClientPublishOptions,
    retries = 3,
  ): Promise<void> {
    const startTime = Date.now();
    const deviceId = this.extractDeviceIdFromTopic(topic);
    const operation = this.extractOperationFromTopic(topic);
    const trackingId = this.trackMessageDelivery(
      deviceId || 'unknown',
      operation,
    );

    const publishOperation = new Promise<void>((resolve, reject) => {
      const attemptPublish = (attemptsLeft: number) => {
        this.client.publish(topic, payload, options, (err) => {
          const latency = Date.now() - startTime;

          if (err) {
            this.updatePublishMetrics(false, latency);
            this.logger.warn(
              `Failed to publish to topic ${topic}. Retrying... (${attemptsLeft} retries left)`,
              {
                topic,
                deviceId,
                operation,
                attemptsLeft,
                errorCode: (err as any).code || 'UNKNOWN',
                errorMessage: err.message,
                trackingId,
                latency,
              },
            );

            if (attemptsLeft > 0) {
              // Exponential backoff: 2s, 4s, 8s
              const delay = Math.pow(2, 4 - attemptsLeft) * 1000;
              setTimeout(() => attemptPublish(attemptsLeft - 1), delay);
            } else {
              this.logger.error(
                `Failed to publish to topic ${topic} after multiple retries.`,
                {
                  topic,
                  deviceId,
                  operation,
                  totalRetries: retries,
                  errorCode: (err as any).code || 'UNKNOWN',
                  errorMessage: err.message,
                  stack: err.stack,
                  trackingId,
                  totalLatency: latency,
                },
              );
              reject(
                new MqttPublishFailedException(
                  deviceId || 'unknown',
                  topic,
                  `${err.message} (after ${retries} retries)`,
                ),
              );
            }
          } else {
            this.updatePublishMetrics(true, latency);
            this.logger.log(`Published to topic ${topic}`, {
              topic,
              deviceId,
              operation,
              payloadSize: payload.length,
              retriesUsed: retries - attemptsLeft,
              trackingId,
              latency,
            });
            resolve();
          }
        });
      };

      attemptPublish(retries);
    });

    // Apply timeout handling (20 seconds for general operations)
    return this.withTimeout(
      publishOperation,
      20000,
      deviceId || 'unknown',
      operation,
    );
  }

  /**
   * Extract device ID from MQTT topic
   */
  private extractDeviceIdFromTopic(topic: string): string | null {
    const parts = topic.split('/');
    // Assuming topic format: simonair/{deviceId}/{operation}
    if (parts.length >= 2 && parts[0] === 'simonair') {
      return parts[1];
    }
    return null;
  }

  /**
   * Extract operation type from MQTT topic
   */
  private extractOperationFromTopic(topic: string): string {
    const parts = topic.split('/');
    // Assuming topic format: simonair/{deviceId}/{operation}
    if (parts.length >= 3) {
      return parts[2];
    }
    return 'unknown';
  }

  public subscribe(
    topic: string,
    callback: (topic: string, payload: Buffer) => void,
  ): void {
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

  /**
   * Get comprehensive diagnostics information for MQTT service
   * Implements requirement 3.1, 3.3, 3.4, 3.6
   */
  async getDiagnostics(): Promise<{
    metrics: {
      totalPublishAttempts: number;
      successfulPublishes: number;
      failedPublishes: number;
      averagePublishLatency: number;
      activeSubscriptions: string[];
      messageDeliveryTracking: Record<string, any>;
    };
    configuration: {
      brokerUrl: string;
      topicPrefix: string;
      reconnectEnabled: boolean;
      maxRetries: number;
    };
  }> {
    const mqttConfig = this.configService.get('mqtt');

    return {
      metrics: {
        totalPublishAttempts: this.publishMetrics.totalAttempts,
        successfulPublishes: this.publishMetrics.successful,
        failedPublishes: this.publishMetrics.failed,
        averagePublishLatency:
          this.publishMetrics.totalAttempts > 0
            ? this.publishMetrics.totalLatency /
              this.publishMetrics.totalAttempts
            : 0,
        activeSubscriptions: this.activeSubscriptions,
        messageDeliveryTracking: Object.fromEntries(
          this.messageDeliveryTracking,
        ),
      },
      configuration: {
        brokerUrl: mqttConfig?.brokerUrl || 'Not configured',
        topicPrefix: this.topicPrefix,
        reconnectEnabled: true,
        maxRetries: 3,
      },
    };
  }

  /**
   * Add MQTT operation timeout handling
   * Implements requirement 3.4, 3.6
   */
  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    deviceId: string,
    operationType: string,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new MqttOperationTimeoutException(deviceId, operationType, timeoutMs),
        );
      }, timeoutMs);
    });

    return Promise.race([operation, timeoutPromise]);
  }

  /**
   * Track message delivery for monitoring
   * Implements requirement 3.4, 3.6
   */
  private trackMessageDelivery(deviceId: string, operation: string): string {
    const trackingId = `${deviceId}-${operation}-${Date.now()}`;
    this.messageDeliveryTracking.set(trackingId, {
      timestamp: new Date(),
      deviceId,
      operation,
    });

    // Clean up old tracking entries (keep only last 100)
    if (this.messageDeliveryTracking.size > 100) {
      const entries = Array.from(this.messageDeliveryTracking.entries());
      const oldestEntries = entries.slice(0, entries.length - 100);
      oldestEntries.forEach(([key]) =>
        this.messageDeliveryTracking.delete(key),
      );
    }

    return trackingId;
  }

  /**
   * Update publish metrics for monitoring
   */
  private updatePublishMetrics(success: boolean, latency: number = 0): void {
    this.publishMetrics.totalAttempts++;
    this.publishMetrics.totalLatency += latency;

    if (success) {
      this.publishMetrics.successful++;
    } else {
      this.publishMetrics.failed++;
    }
  }

  /**
   * Format uptime duration for human-readable logging
   */
  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Publish system status for monitoring
   */
  private publishSystemStatus(
    status: 'online' | 'offline',
    clientId: string,
  ): void {
    try {
      const statusPayload = {
        clientId,
        status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      };

      const topic = `${this.topicPrefix}system/status`;
      const payload = JSON.stringify(statusPayload);

      this.client.publish(topic, payload, { qos: 1, retain: true }, (err) => {
        if (err) {
          this.logger.warn(`Failed to publish system status: ${err.message}`, {
            status,
            clientId,
            error: err.message,
          });
        } else {
          this.logger.debug(`Published system status: ${status}`, {
            status,
            clientId,
            topic,
          });
        }
      });
    } catch (error) {
      this.logger.error(`Error publishing system status: ${error.message}`, {
        status,
        clientId,
        error: error.message,
      });
    }
  }

  /**
   * Start periodic tasks for health monitoring and cleanup
   * Implements requirement 3.1, 3.3, 3.4, 3.6
   */
  private startPeriodicTasks(): void {
    // Run periodic tasks every 5 minutes
    this.periodicTasksInterval = setInterval(
      () => {
        this.runPeriodicHealthChecks();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    this.logger.log('Started periodic MQTT health monitoring tasks', {
      interval: '5 minutes',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Run periodic health checks and cleanup tasks
   * Implements requirement 3.1, 3.3, 3.4, 3.6
   */
  private async runPeriodicHealthChecks(): Promise<void> {
    try {
      // Clean up old message delivery tracking entries
      this.cleanupMessageDeliveryTracking();

      // Check connection health
      const healthStatus = await this.validateMqttConnection();

      // Log health status if unhealthy
      if (healthStatus.status !== 'healthy') {
        this.logger.warn('MQTT connection health check failed', {
          status: healthStatus.status,
          isConnected: healthStatus.isConnected,
          details: healthStatus.details,
        });

        // Attempt reconnection if connection is failed and we haven't exceeded retry limit
        if (healthStatus.status === 'failed' && this.retryCount < 3) {
          this.logger.log(
            'Attempting automatic reconnection due to failed health check',
          );
          await this.forceReconnect();
        }
      } else {
        this.logger.debug('MQTT connection health check passed', {
          status: healthStatus.status,
          uptime: healthStatus.details.uptime,
          connectionStability: healthStatus.details.connectionStability,
        });
      }

      // Log metrics summary
      const diagnostics = await this.getDiagnostics();
      this.logger.debug('MQTT service metrics summary', {
        totalPublishAttempts: diagnostics.metrics.totalPublishAttempts,
        successfulPublishes: diagnostics.metrics.successfulPublishes,
        failedPublishes: diagnostics.metrics.failedPublishes,
        averageLatency: diagnostics.metrics.averagePublishLatency,
        activeSubscriptions: diagnostics.metrics.activeSubscriptions.length,
        pendingDeliveries: Object.keys(
          diagnostics.metrics.messageDeliveryTracking,
        ).length,
      });
    } catch (error) {
      this.logger.error('Error during periodic health check', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Stop periodic tasks (for cleanup on module destroy)
   */
  onModuleDestroy(): void {
    if (this.periodicTasksInterval) {
      clearInterval(this.periodicTasksInterval);
      this.periodicTasksInterval = null;
      this.logger.log('Stopped periodic MQTT health monitoring tasks');
    }

    // Clean up MQTT client
    if (this.client) {
      try {
        this.publishSystemStatus(
          'offline',
          this.client.options.clientId || 'unknown',
        );
        this.client.end(true);
        this.logger.log('MQTT client disconnected and cleaned up');
      } catch (error) {
        this.logger.error('Error cleaning up MQTT client', error.message);
      }
    }

    // Clear all timeouts
    for (const timeout of this.connectionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.connectionTimeouts.clear();
  }
}
