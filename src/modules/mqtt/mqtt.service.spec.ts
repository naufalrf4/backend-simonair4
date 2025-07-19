import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MqttService } from '@/modules/mqtt/mqtt.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { SensorsService } from '@/modules/sensors/sensors.service';
import { DevicesService } from '@/modules/devices/devices.service';

describe('MqttService - Sensor Data Reception Enhancements', () => {
  let service: MqttService;
  let sensorsService: jest.Mocked<SensorsService>;
  let devicesService: jest.Mocked<DevicesService>;

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

    const mockEventsGateway = {
      sendToRoom: jest.fn(),
      broadcast: jest.fn(),
    };

    const mockSensorsService = {
      processAndSaveData: jest.fn(),
    };

    const mockDevicesService = {
      validateDevice: jest.fn(),
      updateLastSeen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: SensorsService, useValue: mockSensorsService },
        { provide: DevicesService, useValue: mockDevicesService },
      ],
    }).compile();

    service = module.get<MqttService>(MqttService);
    sensorsService = module.get(SensorsService);
    devicesService = module.get(DevicesService);
  });

  describe('validateISO8601Timestamp', () => {
    it('should validate correct ISO 8601 timestamp', () => {
      const validTimestamp = '2024-01-15T10:30:00.000Z';
      const result = (service as any).validateISO8601Timestamp(validTimestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(validTimestamp);
    });

    it('should reject invalid timestamp format', () => {
      const invalidTimestamp = '2024-01-15 10:30:00';
      const result = (service as any).validateISO8601Timestamp(
        invalidTimestamp,
      );

      expect(result).toBeNull();
    });

    it('should reject timestamp too far in future', () => {
      const futureTimestamp = new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ).toISOString(); // 2 hours ahead

      expect(() => {
        (service as any).validateISO8601Timestamp(futureTimestamp);
      }).toThrow('Timestamp is too far in the future');
    });
  });

  describe('processSensorReadingWithStatus', () => {
    it('should process sensor reading with status field', () => {
      const rawData = {
        temperature: 25.5,
        temp_status: 'GOOD',
        temperature_voltage: 1.25,
      };

      const result = (service as any).processSensorReadingWithStatus(
        rawData,
        'temperature',
        'temp_status',
      );

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

      const result = (service as any).processSensorReadingWithStatus(
        rawData,
        'ph',
        'ph_status',
      );

      expect(result).toEqual({
        raw: 7.2,
        value: 7.2,
      });
    });

    it('should handle invalid status value', () => {
      const rawData = {
        tds: 450,
        tds_status: 'INVALID',
      };

      const result = (service as any).processSensorReadingWithStatus(
        rawData,
        'tds',
        'tds_status',
      );

      expect(result).toEqual({
        raw: 450,
        value: 450,
      });
    });

    it('should return undefined for missing sensor value', () => {
      const rawData = {
        temp_status: 'GOOD',
      };

      const result = (service as any).processSensorReadingWithStatus(
        rawData,
        'temperature',
        'temp_status',
      );

      expect(result).toBeUndefined();
    });
  });

  describe('validateSingleReading', () => {
    it('should validate complete sensor reading', () => {
      const rawData = {
        temperature: 25.5,
        temp_status: 'GOOD',
        ph: 7.2,
        ph_status: 'GOOD',
        tds: 450,
        tds_status: 'BAD',
        do: 6.8,
        do_status: 'GOOD',
      };

      const timestamp = new Date();
      const result = (service as any).validateSingleReading(
        'SMNR-TEST',
        rawData,
        timestamp,
      );

      expect(result.timestamp).toBe(timestamp);
      expect(result.temperature).toEqual({
        raw: 25.5,
        value: 25.5,
        status: 'GOOD',
      });
      expect(result.ph).toEqual({
        raw: 7.2,
        value: 7.2,
        status: 'GOOD',
      });
      expect(result.tds).toEqual({
        raw: 450,
        value: 450,
        status: 'BAD',
      });
      expect(result.do_level).toEqual({
        raw: 6.8,
        value: 6.8,
        status: 'GOOD',
      });
    });

    it('should handle partial sensor data', () => {
      const rawData = {
        temperature: 25.5,
        ph: 7.2,
      };

      const timestamp = new Date();
      const result = (service as any).validateSingleReading(
        'SMNR-TEST',
        rawData,
        timestamp,
      );

      expect(result.timestamp).toBe(timestamp);
      expect(result.temperature).toBeDefined();
      expect(result.ph).toBeDefined();
      expect(result.tds).toBeUndefined();
      expect(result.do_level).toBeUndefined();
    });

    it('should throw error for empty sensor data', () => {
      const rawData = {};
      const timestamp = new Date();

      expect(() => {
        (service as any).validateSingleReading('SMNR-TEST', rawData, timestamp);
      }).toThrow(
        'At least one sensor reading (temperature, ph, tds, do) must be provided',
      );
    });
  });

  describe('validateAndProcessSensorData', () => {
    it('should validate sensor data with timestamp', async () => {
      const rawData = {
        timestamp: '2024-01-15T10:30:00.000Z',
        temperature: 25.5,
        temp_status: 'GOOD',
        ph: 7.2,
        ph_status: 'GOOD',
      };

      const result = await (service as any).validateAndProcessSensorData(
        'SMNR-TEST',
        rawData,
      );

      expect(result.timestamp).toEqual(new Date('2024-01-15T10:30:00.000Z'));
      expect(result.temperature).toBeDefined();
      expect(result.ph).toBeDefined();
    });

    it('should use current timestamp when not provided', async () => {
      const rawData = {
        temperature: 25.5,
      };

      const beforeTime = new Date();
      const result = await (service as any).validateAndProcessSensorData(
        'SMNR-TEST',
        rawData,
      );
      const afterTime = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });

    it('should handle multiple readings array', async () => {
      const rawData = {
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

      // Mock the processIndividualReading method
      const processIndividualReadingSpy = jest
        .spyOn(service as any, 'processIndividualReading')
        .mockResolvedValue(undefined);

      const result = await (service as any).validateAndProcessSensorData(
        'SMNR-TEST',
        rawData,
      );

      expect(processIndividualReadingSpy).toHaveBeenCalledTimes(2);
      expect(result.temperature.value).toBe(25.5); // Should use latest reading
    });

    it('should throw error for invalid JSON structure', async () => {
      const rawData = null;

      await expect(
        (service as any).validateAndProcessSensorData('SMNR-TEST', rawData),
      ).rejects.toThrow('Sensor data must be a valid JSON object');
    });

    it('should throw error for invalid timestamp', async () => {
      const rawData = {
        timestamp: 'invalid-timestamp',
        temperature: 25.5,
      };

      await expect(
        (service as any).validateAndProcessSensorData('SMNR-TEST', rawData),
      ).rejects.toThrow('Invalid timestamp format');
    });
  });
});
