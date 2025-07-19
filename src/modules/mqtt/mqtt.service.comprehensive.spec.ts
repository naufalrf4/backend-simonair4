import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MqttService } from '@/modules/mqtt/mqtt.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { SensorsService } from '@/modules/sensors/sensors.service';
import { DevicesService } from '@/modules/devices/devices.service';
import { Device } from '@/modules/devices/entities/device.entity';
import { SensorData } from '@/modules/sensors/entities/sensor-data.entity';
import { getMqttPublishCalls, simulateMqttError, simulateMqttMessage } from 'test/mqtt-test.utils';

describe('MqttService - Comprehensive Test Suite', () => {
  let service: MqttService;
  let mockSensorsService: jest.Mocked<SensorsService>;
  let mockDevicesService: jest.Mocked<DevicesService>;
  let mockEventsGateway: jest.Mocked<EventsGateway>;
  let mockCacheManager: any;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'mqtt') {
          return {
            brokerUrl: 'ws://test-broker:8083/mqtt',
            clientId: 'test-client',
            username: 'test-user',
            password: 'test-pass',
            topicPrefix: 'simonair/',
            retryInterval: 1000,
            maxRetries: 3,
            publishTimeout: 5000,
            qos: 1,
          };
        }
        return undefined;
      }),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockEventsGatewayValue = {
      sendToRoom: jest.fn(),
      broadcast: jest.fn(),
    };

    const mockSensorsServiceValue = {
      processAndSaveData: jest.fn(),
    };

    const mockDevicesServiceValue = {
      validateDevice: jest.fn(),
      updateLastSeen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: EventsGateway, useValue: mockEventsGatewayValue },
        { provide: SensorsService, useValue: mockSensorsServiceValue },
        { provide: DevicesService, useValue: mockDevicesServiceValue },
      ],
    }).compile();

    service = module.get<MqttService>(MqttService);
    mockSensorsService = module.get(SensorsService);
    mockDevicesService = module.get(DevicesService);
    mockEventsGateway = module.get(EventsGateway);

    // Mock MQTT client to simulate connected state
    (service as any).client = {
      connected: true,
      publish: jest.fn((topic, message, options, callback) => {
        if (callback) callback(null);
      }),
      subscribe: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
    };

    // Setup default mocks for device validation and sensor processing
    mockDevicesService.validateDevice.mockResolvedValue({} as Device);
    mockSensorsService.processAndSaveData.mockResolvedValue({} as SensorData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      expect(service).toBeInstanceOf(MqttService);
    });
  });

  describe('Calibration Publishing', () => {
    it('should publish pH calibration successfully', async () => {
      const calibrationRequest = {
        sensor_type: 'ph',
        calibration_data: {
          m: -7.153,
          c: 22.456
        }
      };

      const publishSpy = (service as any).client.publish;

      await service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest);

      expect(publishSpy).toHaveBeenCalledWith(
        'simonair/SMNR-1234/calibration',
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );
      
      const publishedMessage = publishSpy.mock.calls[0][1];
      const publishedData = JSON.parse(publishedMessage);
      expect(publishedData).toHaveProperty('ph');
      expect(publishedData.ph).toEqual({ m: -7.153, c: 22.456 });
    });

    it('should publish TDS calibration successfully', async () => {
      const calibrationRequest = {
        sensor_type: 'tds',
        calibration_data: {
          v: 1.42,
          std: 442,
          t: 25.0
        }
      };

      const publishSpy = (service as any).client.publish;

      await service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest);

      expect(publishSpy).toHaveBeenCalled();
      
      const publishedMessage = publishSpy.mock.calls[0][1];
      const publishedData = JSON.parse(publishedMessage);
      expect(publishedData).toHaveProperty('tds');
      expect(publishedData.tds).toEqual({ v: 1.42, std: 442, t: 25.0 });
    });

    it('should publish DO calibration successfully', async () => {
      const calibrationRequest = {
        sensor_type: 'do',
        calibration_data: {
          ref: 8.0,
          v: 1.171,
          t: 25.0
        }
      };

      const publishSpy = (service as any).client.publish;

      await service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest);

      expect(publishSpy).toHaveBeenCalled();
      
      const publishedMessage = publishSpy.mock.calls[0][1];
      const publishedData = JSON.parse(publishedMessage);
      expect(publishedData).toHaveProperty('do');
      expect(publishedData.do).toEqual({ ref: 8.0, v: 1.171, t: 25.0 });
    });

    it('should handle calibration publishing errors', async () => {
      const calibrationRequest = {
        sensor_type: 'ph',
        calibration_data: {
          m: -7.153,
          c: 22.456
        }
      };

      // Mock client as disconnected to trigger error
      (service as any).client.connected = false;

      await expect(
        service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest)
      ).rejects.toThrow('MQTT client is not connected');
      
      // Reset for other tests
      (service as any).client.connected = true;
    });

    it('should validate calibration data before publishing', async () => {
      const invalidCalibrationRequest = {
        sensor_type: 'ph',
        calibration_data: {
          m: 'invalid', // Should be number
          c: 22.456
        }
      };

      await expect(
        service.publishCalibrationWithValidation('SMNR-1234', invalidCalibrationRequest)
      ).rejects.toThrow();
    });

    it('should retry calibration publishing on failure', async () => {
      const calibrationRequest = {
        sensor_type: 'ph',
        calibration_data: {
          m: -7.153,
          c: 22.456
        }
      };

      // Mock first call to fail, second to succeed
      const mqttPublishSpy = jest.spyOn(service as any, 'publishWithRetry')
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(true);

      await expect(
        service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest)
      ).resolves.not.toThrow();

      expect(mqttPublishSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Threshold Publishing', () => {
    it('should publish thresholds successfully', async () => {
      const thresholdData = {
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
        do_min: '5.0',
        do_max: '12.0',
        temp_min: '20.0',
        temp_max: '30.0'
      };

      await service.publishThresholdsWithValidation('SMNR-1234', thresholdData);

      const publishCalls = getMqttPublishCalls();
      expect(publishCalls).toHaveLength(1);
      expect(publishCalls[0][0]).toBe('simonair/SMNR-1234/thresholds');

      const publishedData = JSON.parse(publishCalls[0][1]);
      expect(publishedData).toHaveProperty('ph');
      expect(publishedData.ph).toEqual({ good_min: 6.5, good_max: 8.5 });
    });

    it('should filter empty threshold fields', async () => {
      const thresholdData = {
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '', // Empty field should be filtered
        tds_max: '',
        do_min: '5.0',
        do_max: '12.0'
      };

      await service.publishThresholdsWithValidation('SMNR-1234', thresholdData);

      const publishCalls = getMqttPublishCalls();
      const publishedData = JSON.parse(publishCalls[0][1]);
      
      expect(publishedData).toHaveProperty('ph');
      expect(publishedData).toHaveProperty('do');
      expect(publishedData).not.toHaveProperty('tds'); // Should be filtered out
    });

    it('should handle threshold publishing errors', async () => {
      const thresholdData = {
        ph_min: '6.5',
        ph_max: '8.5'
      };

      simulateMqttError(new Error('MQTT connection lost'));

      await expect(
        service.publishThresholdsWithValidation('SMNR-1234', thresholdData)
      ).rejects.toThrow('MQTT connection lost');
    });

    it('should validate threshold data format', async () => {
      const invalidThresholdData = {
        ph_min: 'invalid', // Should be numeric string
        ph_max: '8.5'
      };

      await expect(
        service.publishThresholdsWithValidation('SMNR-1234', invalidThresholdData)
      ).rejects.toThrow();
    });
  });

  describe('Sensor Data Reception', () => {
    beforeEach(() => {
      // Mock device validation (partial mock for testing)
      mockDevicesService.validateDevice.mockResolvedValue({} as Device);
      
      // Mock sensor data processing (partial mock for testing)
      mockSensorsService.processAndSaveData.mockResolvedValue({} as SensorData);
    });

    it('should process valid sensor data message', async () => {
      const sensorData = {
        timestamp: '2024-01-15T10:30:00.000Z',
        temperature: 25.5,
        temp_status: 'GOOD',
        ph: 7.2,
        ph_status: 'GOOD',
        tds: 450,
        tds_status: 'GOOD',
        do_level: 8.5,
        do_status: 'GOOD'
      };

      simulateMqttMessage('simonair/SMNR-1234/sensor_data', sensorData);

      expect(mockDevicesService.validateDevice).toHaveBeenCalledWith('SMNR-1234');
      expect(mockSensorsService.processAndSaveData).toHaveBeenCalledWith(
        'SMNR-1234',
        expect.objectContaining({
          timestamp: expect.any(Date),
          temperature: expect.objectContaining({
            value: 25.5,
            status: 'GOOD'
          }),
          ph: expect.objectContaining({
            value: 7.2,
            status: 'GOOD'
          })
        })
      );
    });

    it('should validate ISO 8601 timestamp format', async () => {
      const validTimestamp = '2024-01-15T10:30:00.000Z';
      const result = (service as any).validateISO8601Timestamp(validTimestamp);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(validTimestamp);
    });

    it('should reject invalid timestamp format', async () => {
      const invalidTimestamp = '2024-01-15 10:30:00';
      const result = (service as any).validateISO8601Timestamp(invalidTimestamp);
      
      expect(result).toBeNull();
    });

    it('should reject timestamp too far in future', async () => {
      const futureTimestamp = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      
      expect(() => {
        (service as any).validateISO8601Timestamp(futureTimestamp);
      }).toThrow('Timestamp is too far in the future');
    });

    it('should process sensor readings with status fields', () => {
      const rawData = {
        temperature: 25.5,
        temp_status: 'GOOD',
        temperature_voltage: 1.25,
      };

      const result = (service as any).processSensorReadingWithStatus(rawData, 'temperature', 'temp_status');

      expect(result).toEqual({
        raw: 25.5,
        value: 25.5,
        status: 'GOOD',
        voltage: 1.25,
      });
    });

    it('should handle missing status field', () => {
      const rawData = {
        ph: 7.2,
      };

      const result = (service as any).processSensorReadingWithStatus(rawData, 'ph', 'ph_status');

      expect(result).toEqual({
        raw: 7.2,
        value: 7.2,
      });
    });

    it('should update device last_seen timestamp', async () => {
      const sensorData = {
        timestamp: '2024-01-15T10:30:00.000Z',
        temperature: 25.5
      };

      simulateMqttMessage('simonair/SMNR-1234/sensor_data', sensorData);

      expect(mockDevicesService.updateLastSeen).toHaveBeenCalledWith('SMNR-1234');
    });

    it('should handle invalid device ID', async () => {
      // Should reject invalid device
      mockDevicesService.validateDevice.mockRejectedValue(new Error('Device not found'));

      const sensorData = {
        timestamp: '2024-01-15T10:30:00.000Z',
        temperature: 25.5
      };

      simulateMqttMessage('simonair/INVALID-DEVICE/sensor_data', sensorData);

      expect(mockSensorsService.processAndSaveData).not.toHaveBeenCalled();
    });

    it('should handle multiple readings array', async () => {
      const sensorData = {
        readings: [
          {
            timestamp: '2024-01-15T10:30:00.000Z',
            temperature: 25.0,
            temp_status: 'GOOD',
          },
          {
            timestamp: '2024-01-15T10:31:00.000Z',
            temperature: 25.5,
            temp_status: 'GOOD',
          },
        ],
      };

      const processIndividualReadingSpy = jest.spyOn(service as any, 'processIndividualReading')
        .mockResolvedValue(undefined);

      simulateMqttMessage('simonair/SMNR-1234/sensor_data', sensorData);

      expect(processIndividualReadingSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection Health Monitoring', () => {
    it('should validate MQTT connection', async () => {
      const isHealthy = await service.validateMqttConnection();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should handle connection health check failures', async () => {
      simulateMqttError(new Error('Connection timeout'));

      const isHealthy = await service.validateMqttConnection();
      expect(isHealthy).toBe(false);
    });

    it('should implement exponential backoff for reconnection', async () => {
      const reconnectSpy = jest.spyOn(service as any, 'reconnectWithBackoff');

      simulateMqttError(new Error('Connection lost'));

      expect(reconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle MQTT broker connectivity issues', async () => {
      simulateMqttError(new Error('ECONNREFUSED'));

      const calibrationRequest = {
        sensor_type: 'ph',
        calibration_data: { m: 1, c: 2 }
      };

      await expect(
        service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest)
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('should handle message timeout scenarios', async () => {
      jest.useFakeTimers();

      const calibrationRequest = {
        sensor_type: 'ph', 
        calibration_data: { m: 1, c: 2 }
      };

      const promise = service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest);

      // Advance time to trigger timeout
      jest.advanceTimersByTime(6000);

      await expect(promise).rejects.toThrow('timeout');

      jest.useRealTimers();
    });

    it('should handle invalid JSON in sensor data', async () => {
      const invalidMessage = 'invalid json';

      // Should not throw, but should be logged as error
      expect(() => {
        simulateMqttMessage('simonair/SMNR-1234/sensor_data', invalidMessage);
      }).not.toThrow();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-throughput message scenarios', async () => {
      const startTime = Date.now();
      const messageCount = 100;

      for (let i = 0; i < messageCount; i++) {
        simulateMqttMessage('simonair/SMNR-1234/sensor_data', {
          timestamp: new Date().toISOString(),
          temperature: 25 + Math.random()
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 100 messages in under 1 second
      expect(processingTime).toBeLessThan(1000);
    });

    it('should implement proper message queuing', async () => {
      const queueSpy = jest.spyOn(service as any, 'enqueueMessage');

      const calibrationRequest = {
        sensor_type: 'ph',
        calibration_data: { m: 1, c: 2 }
      };

      for (let i = 0; i < 10; i++) {
        await service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest);
      }

      expect(queueSpy).toHaveBeenCalledTimes(10);
    });

    it('should handle memory efficiently with large payloads', async () => {
      const largeCalibrationRequest = {
        sensor_type: 'ph',
        calibration_data: {
          m: -7.153,
          c: 22.456,
          // Add large data array to test memory handling
          calibration_points: Array(1000).fill(0).map((_, i) => ({
            input: i,
            output: i * 1.5
          }))
        }
      };

      await expect(
        service.publishCalibrationWithValidation('SMNR-1234', largeCalibrationRequest)
      ).resolves.not.toThrow();
    });
  });
});
