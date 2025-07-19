import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MqttService } from '@/modules/mqtt/mqtt.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { SensorsService } from '@/modules/sensors/sensors.service';
import { DevicesService } from '@/modules/devices/devices.service';
import { Device } from '@/modules/devices/entities/device.entity';
import { SensorData } from '@/modules/sensors/entities/sensor-data.entity';

describe('MqttService - Core Functionality', () => {
  let service: MqttService;
  let mockSensorsService: jest.Mocked<SensorsService>;
  let mockDevicesService: jest.Mocked<DevicesService>;
  let mockEventsGateway: jest.Mocked<EventsGateway>;
  let mockClient: any;

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
        if (key === 'mqtt.topicPrefix') {
          return 'simonair/';
        }
        return undefined;
      }),
    };

    const mockCacheManager = {
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

    // Create detailed mock MQTT client
    mockClient = {
      connected: true,
      publish: jest.fn((topic, message, options, callback) => {
        if (callback) callback(null);
      }),
      subscribe: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
    };

    // Inject mock client
    (service as any).client = mockClient;

    // Setup default mocks
    mockDevicesService.validateDevice.mockResolvedValue({} as Device);
    mockSensorsService.processAndSaveData.mockResolvedValue({} as SensorData);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
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

      await service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest);

      expect(mockClient.publish).toHaveBeenCalledWith(
        'simonair/SMNR-1234/calibration',
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );
      
      const publishedMessage = mockClient.publish.mock.calls[0][1];
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

      await service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest);

      expect(mockClient.publish).toHaveBeenCalled();
      
      const publishedMessage = mockClient.publish.mock.calls[0][1];
      const publishedData = JSON.parse(publishedMessage);
      expect(publishedData).toHaveProperty('tds');
      expect(publishedData.tds).toEqual({ v: 1.42, std: 442, t: 25.0 });
    });

    it('should handle calibration publishing errors', async () => {
      const calibrationRequest = {
        sensor_type: 'ph',
        calibration_data: {
          m: -7.153,
          c: 22.456
        }
      };

      // Mock client as disconnected
      mockClient.connected = false;

      await expect(
        service.publishCalibrationWithValidation('SMNR-1234', calibrationRequest)
      ).rejects.toThrow('MQTT client is not connected');
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
  });

  describe('Threshold Publishing', () => {
    it('should publish thresholds successfully', async () => {
      const thresholdData = {
        ph_min: '6.0',
        ph_max: '8.0',
        temp_min: '20.0',
        temp_max: '30.0',
        do_min: '5.0',
        do_max: '10.0',
        tds_min: '100',
        tds_max: '500'
      };

      await service.publishThresholdsWithValidation('SMNR-1234', thresholdData);

      expect(mockClient.publish).toHaveBeenCalledWith(
        'simonair/SMNR-1234/thresholds',
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle threshold publishing errors', async () => {
      const thresholdData = {
        ph_min: '6.0',
        ph_max: '8.0'
      };

      // Mock client as disconnected
      mockClient.connected = false;

      await expect(
        service.publishThresholdsWithValidation('SMNR-1234', thresholdData)
      ).rejects.toThrow('MQTT client is not connected');
    });
  });

  describe('Sensor Data Validation', () => {
    it('should validate ISO 8601 timestamp format', () => {
      const validTimestamp = '2024-01-15T10:30:00.000Z';
      const result = (service as any).validateISO8601Timestamp(validTimestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(validTimestamp);
    });

    it('should reject invalid timestamp format', () => {
      const invalidTimestamp = '2024-01-15 10:30:00';
      const result = (service as any).validateISO8601Timestamp(invalidTimestamp);

      expect(result).toBeNull();
    });

    it('should reject timestamp too far in future', () => {
      const futureTimestamp = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      expect(() => {
        (service as any).validateISO8601Timestamp(futureTimestamp);
      }).toThrow('Timestamp is too far in the future');
    });
  });

  describe('Connection Health', () => {
    it('should validate MQTT connection', async () => {
      const result = await service.validateMqttConnection();
      expect(result).toBeDefined();
      expect(typeof result === 'object' || typeof result === 'boolean').toBe(true);
    });

    it('should handle connection health check when disconnected', async () => {
      mockClient.connected = false;
      const result = await service.validateMqttConnection();
      expect(result).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-throughput message scenarios', async () => {
      const promises: Promise<void>[] = [];
      const calibrationRequest = {
        sensor_type: 'ph',
        calibration_data: { m: 1, c: 2 }
      };

      for (let i = 0; i < 50; i++) {
        promises.push(
          service.publishCalibrationWithValidation(`SMNR-${String(i).padStart(4, '0')}`, calibrationRequest)
        );
      }

      await Promise.all(promises);
      expect(mockClient.publish).toHaveBeenCalledTimes(50);
    });

    it('should handle memory efficiently with large payloads', async () => {
      const largeCalibrationRequest = {
        sensor_type: 'ph',
        calibration_data: {
          m: -7.153,
          c: 22.456,
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
