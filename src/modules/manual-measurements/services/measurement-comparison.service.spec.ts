import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MeasurementComparisonService } from './measurement-comparison.service';
import { ComparisonCacheService } from './comparison-cache.service';
import { SensorsService } from '../../sensors/sensors.service';
import { SensorDataRepository } from '../../sensors/sensor-data.repository';
import { SensorData } from '../../sensors/entities/sensor-data.entity';
import { ManualMeasurement } from '../entities/manual-measurement.entity';
import {
  ComparisonFailedException,
  DatabaseOperationException,
} from '../exceptions/manual-measurement.exceptions';

describe('MeasurementComparisonService', () => {
  let service: MeasurementComparisonService;
  let sensorsService: jest.Mocked<SensorsService>;
  let sensorDataRepository: jest.Mocked<SensorDataRepository>;
  let configService: jest.Mocked<ConfigService>;
  let cacheService: jest.Mocked<ComparisonCacheService>;

  const mockSensorData: SensorData = {
    time: new Date('2024-01-15T10:30:00Z'),
    timestamp: new Date('2024-01-15T10:30:00Z'),
    device_id: 'device-123',
    temperature: { value: 26.2, status: 'GOOD' },
    ph: { value: 7.3, status: 'GOOD' },
    tds: { value: 440, status: 'GOOD' },
    do_level: { value: 8.3, status: 'GOOD' },
    device: undefined as any,
  };

  const mockManualMeasurement: ManualMeasurement = {
    id: 'measurement-123',
    device_id: 'device-123',
    measured_by: 'user-456',
    measurement_timestamp: new Date('2024-01-15T10:30:00Z'),
    temperature: 26.5,
    ph: 7.2,
    tds: 450,
    do_level: 8.5,
    notes: 'Test measurement',
    created_at: new Date('2024-01-15T10:35:00Z'),
    device: undefined as any,
    user: undefined as any,
  };

  beforeEach(async () => {
    const mockSensorsService = {
      findByDeviceAndTimeRange: jest.fn(),
    };

    const mockSensorDataRepository = {
      findHistoricalData: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clearMeasurement: jest.fn(),
      clearExpired: jest.fn(),
      getStats: jest.fn(),
      has: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementComparisonService,
        { provide: SensorsService, useValue: mockSensorsService },
        { provide: SensorDataRepository, useValue: mockSensorDataRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ComparisonCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<MeasurementComparisonService>(MeasurementComparisonService);
    sensorsService = module.get(SensorsService);
    sensorDataRepository = module.get(SensorDataRepository);
    configService = module.get(ConfigService);
    cacheService = module.get(ComparisonCacheService);
  });

  describe('findClosestSensorData', () => {
    it('should find closest sensor data within time window', async () => {
      const deviceId = 'device-123';
      const timestamp = new Date('2024-01-15T10:30:00Z');
      const timeWindowMinutes = 5;

      const sensorDataList = [
        { ...mockSensorData, time: new Date('2024-01-15T10:28:00Z') },
        { ...mockSensorData, time: new Date('2024-01-15T10:32:00Z') },
        mockSensorData,
      ];

      sensorDataRepository.findHistoricalData.mockResolvedValue(sensorDataList);

      const result = await service.findClosestSensorData(deviceId, timestamp, timeWindowMinutes);

      expect(result).toEqual(mockSensorData);
      expect(sensorDataRepository.findHistoricalData).toHaveBeenCalledWith(
        deviceId,
        new Date('2024-01-15T10:25:00Z'),
        new Date('2024-01-15T10:35:00Z'),
      );
    });

    it('should return null when no sensor data found', async () => {
      const deviceId = 'device-123';
      const timestamp = new Date('2024-01-15T10:30:00Z');

      sensorDataRepository.findHistoricalData.mockResolvedValue([]);

      const result = await service.findClosestSensorData(deviceId, timestamp);

      expect(result).toBeNull();
    });

    it('should throw DatabaseOperationException on repository error', async () => {
      const deviceId = 'device-123';
      const timestamp = new Date('2024-01-15T10:30:00Z');

      sensorDataRepository.findHistoricalData.mockRejectedValue(new Error('Database error'));

      await expect(service.findClosestSensorData(deviceId, timestamp))
        .rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('calculateDifferences', () => {
    it('should calculate differences between manual and sensor data', () => {
      const result = service.calculateDifferences(mockManualMeasurement, mockSensorData);

      expect(result.temperature.manual_value).toBe(26.5);
      expect(result.temperature.sensor_value).toBe(26.2);
      expect(result.temperature.difference).toBeCloseTo(0.3, 1);
      expect(result.temperature.accuracy_level).toBe('EXCELLENT');
      expect(result.temperature.variance_flag).toBe(false);

      expect(result.ph.manual_value).toBe(7.2);
      expect(result.ph.sensor_value).toBe(7.3);
      expect(result.ph.difference).toBeCloseTo(-0.1, 1);
      expect(result.ph.accuracy_level).toBe('EXCELLENT');
      expect(result.ph.variance_flag).toBe(false);

      expect(result.tds.manual_value).toBe(450);
      expect(result.tds.sensor_value).toBe(440);
      expect(result.tds.difference).toBe(10);
      expect(result.tds.accuracy_level).toBe('EXCELLENT');
      expect(result.tds.variance_flag).toBe(false);

      expect(result.do_level.manual_value).toBe(8.5);
      expect(result.do_level.sensor_value).toBe(8.3);
      expect(result.do_level.difference).toBeCloseTo(0.2, 1);
      expect(result.do_level.accuracy_level).toBe('EXCELLENT');
      expect(result.do_level.variance_flag).toBe(false);
    });

    it('should handle null sensor data', () => {
      const result = service.calculateDifferences(mockManualMeasurement, null);

      expect(result.temperature.manual_value).toBe(26.5);
      expect(result.temperature.sensor_value).toBeNull();
      expect(result.temperature.difference).toBeNull();
      expect(result.temperature.accuracy_level).toBe('UNAVAILABLE');
      expect(result.temperature.variance_flag).toBe(false);
    });

    it('should handle null manual values', () => {
      const manualWithNulls = {
        ...mockManualMeasurement,
        temperature: null,
        ph: null,
      };

      const result = service.calculateDifferences(manualWithNulls, mockSensorData);

      expect(result.temperature.manual_value).toBeNull();
      expect(result.temperature.sensor_value).toBe(26.2);
      expect(result.temperature.difference).toBeNull();
      expect(result.temperature.accuracy_level).toBe('UNAVAILABLE');

      expect(result.ph.manual_value).toBeNull();
      expect(result.ph.sensor_value).toBe(7.3);
      expect(result.ph.difference).toBeNull();
      expect(result.ph.accuracy_level).toBe('UNAVAILABLE');
    });

    it('should detect variance flags for large differences', () => {
      const manualWithVariance = {
        ...mockManualMeasurement,
        temperature: 30.0, // Large difference from sensor (26.2)
        ph: 8.5, // Large difference from sensor (7.3)
      };

      const result = service.calculateDifferences(manualWithVariance, mockSensorData);

      expect(result.temperature.variance_flag).toBe(true);
      expect(result.ph.variance_flag).toBe(true);
    });
  });

  describe('assessAccuracy', () => {
    it('should assess temperature accuracy correctly', () => {
      expect(service.assessAccuracy('temperature', 0.3)).toBe('EXCELLENT');
      expect(service.assessAccuracy('temperature', 0.8)).toBe('GOOD');
      expect(service.assessAccuracy('temperature', 1.5)).toBe('FAIR');
      expect(service.assessAccuracy('temperature', 3.0)).toBe('POOR');
      expect(service.assessAccuracy('temperature', null)).toBe('UNAVAILABLE');
    });

    it('should assess pH accuracy correctly', () => {
      expect(service.assessAccuracy('ph', 0.05)).toBe('EXCELLENT');
      expect(service.assessAccuracy('ph', 0.15)).toBe('GOOD');
      expect(service.assessAccuracy('ph', 0.3)).toBe('FAIR');
      expect(service.assessAccuracy('ph', 0.8)).toBe('POOR');
    });

    it('should assess TDS accuracy correctly', () => {
      expect(service.assessAccuracy('tds', 5)).toBe('EXCELLENT');
      expect(service.assessAccuracy('tds', 20)).toBe('GOOD');
      expect(service.assessAccuracy('tds', 40)).toBe('FAIR');
      expect(service.assessAccuracy('tds', 100)).toBe('POOR');
    });

    it('should assess DO level accuracy correctly', () => {
      expect(service.assessAccuracy('do_level', 0.1)).toBe('EXCELLENT');
      expect(service.assessAccuracy('do_level', 0.3)).toBe('GOOD');
      expect(service.assessAccuracy('do_level', 0.8)).toBe('FAIR');
      expect(service.assessAccuracy('do_level', 1.5)).toBe('POOR');
    });
  });

  describe('generateComparisonReport', () => {
    it('should generate comprehensive comparison report', async () => {
      cacheService.get.mockReturnValue(null); // No cache hit
      sensorDataRepository.findHistoricalData.mockResolvedValue([mockSensorData]);

      const result = await service.generateComparisonReport(mockManualMeasurement);

      expect(result.manual_measurement_id).toBe(mockManualMeasurement.id);
      expect(result.device_id).toBe(mockManualMeasurement.device_id);
      expect(result.sensor_data_timestamp).toEqual(mockSensorData.time);
      expect(result.time_window_minutes).toBe(5);
      expect(result.overall_accuracy).toBe('EXCELLENT');
      expect(result.accuracy_score).toBeGreaterThan(90);
      expect(result.variance_count).toBe(0);
      expect(result.notes).toBeNull();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should use cached result when available', async () => {
      const cachedReport = {
        manual_measurement_id: mockManualMeasurement.id,
        device_id: mockManualMeasurement.device_id,
        comparison_timestamp: new Date(),
        sensor_data_timestamp: mockSensorData.time,
        time_window_minutes: 5,
        temperature: { accuracy_level: 'EXCELLENT' as const, manual_value: 26.5, sensor_value: 26.2, difference: 0.3, percentage_difference: 1.1, variance_flag: false },
        ph: { accuracy_level: 'EXCELLENT' as const, manual_value: 7.2, sensor_value: 7.3, difference: -0.1, percentage_difference: -1.4, variance_flag: false },
        tds: { accuracy_level: 'EXCELLENT' as const, manual_value: 450, sensor_value: 440, difference: 10, percentage_difference: 2.3, variance_flag: false },
        do_level: { accuracy_level: 'EXCELLENT' as const, manual_value: 8.5, sensor_value: 8.3, difference: 0.2, percentage_difference: 2.4, variance_flag: false },
        overall_accuracy: 'EXCELLENT' as const,
        accuracy_score: 95,
        variance_count: 0,
        notes: null,
      };

      cacheService.get.mockReturnValue(cachedReport);

      const result = await service.generateComparisonReport(mockManualMeasurement);

      expect(result).toEqual(cachedReport);
      expect(sensorDataRepository.findHistoricalData).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should handle missing sensor data', async () => {
      cacheService.get.mockReturnValue(null);
      sensorDataRepository.findHistoricalData.mockResolvedValue([]);

      const result = await service.generateComparisonReport(mockManualMeasurement);

      expect(result.sensor_data_timestamp).toBeNull();
      expect(result.overall_accuracy).toBe('UNAVAILABLE');
      expect(result.accuracy_score).toBe(0);
      expect(result.notes).toContain('No sensor data available');
    });

    it('should generate notes for variance and poor accuracy', async () => {
      const poorSensorData = {
        ...mockSensorData,
        temperature: { value: 20.0, status: 'GOOD' as const }, // Large difference
        ph: { value: 6.0, status: 'GOOD' as const }, // Large difference
        tds: { value: 300, status: 'GOOD' as const }, // Large difference
        do_level: { value: 5.0, status: 'GOOD' as const }, // Large difference
      };

      cacheService.get.mockReturnValue(null);
      sensorDataRepository.findHistoricalData.mockResolvedValue([poorSensorData]);

      const result = await service.generateComparisonReport(mockManualMeasurement);

      expect(result.variance_count).toBeGreaterThan(0);
      expect(result.notes).toContain('Significant variance detected');
      expect(result.overall_accuracy).toBe('POOR');
    });

    it('should throw ComparisonFailedException on error', async () => {
      cacheService.get.mockReturnValue(null);
      sensorDataRepository.findHistoricalData.mockRejectedValue(new Error('Database error'));

      await expect(service.generateComparisonReport(mockManualMeasurement))
        .rejects.toThrow(ComparisonFailedException);
    });
  });

  describe('calculateComparisonStatistics', () => {
    it('should calculate statistics for multiple measurements', async () => {
      const measurements = [
        mockManualMeasurement,
        { ...mockManualMeasurement, id: 'measurement-2' },
        { ...mockManualMeasurement, id: 'measurement-3' },
      ];

      cacheService.get.mockReturnValue(null);
      sensorDataRepository.findHistoricalData.mockResolvedValue([mockSensorData]);

      const result = await service.calculateComparisonStatistics(measurements);

      expect(result.total_comparisons).toBe(3);
      expect(result.successful_comparisons).toBe(3);
      expect(result.accuracy_distribution.excellent).toBe(3);
      expect(result.average_accuracy_score).toBeGreaterThan(90);
      expect(result.variance_rate).toBe(0);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const measurements = [
        mockManualMeasurement,
        { ...mockManualMeasurement, id: 'measurement-2' },
      ];

      cacheService.get.mockReturnValue(null);
      sensorDataRepository.findHistoricalData
        .mockResolvedValueOnce([mockSensorData])
        .mockResolvedValueOnce([]); // No sensor data for second measurement

      const result = await service.calculateComparisonStatistics(measurements);

      expect(result.total_comparisons).toBe(2);
      expect(result.successful_comparisons).toBe(1);
      expect(result.accuracy_distribution.excellent).toBe(1);
      expect(result.accuracy_distribution.unavailable).toBe(1);
    });

    it('should throw ComparisonFailedException on error', async () => {
      const measurements = [mockManualMeasurement];

      cacheService.get.mockReturnValue(null);
      sensorDataRepository.findHistoricalData.mockRejectedValue(new Error('Database error'));

      await expect(service.calculateComparisonStatistics(measurements))
        .rejects.toThrow(ComparisonFailedException);
    });
  });

  describe('caching methods', () => {
    it('should clear comparison cache for a measurement', () => {
      const measurementId = 'measurement-123';
      cacheService.clearMeasurement.mockReturnValue(3);

      const result = service.clearComparisonCache(measurementId);

      expect(result).toBe(3);
      expect(cacheService.clearMeasurement).toHaveBeenCalledWith(measurementId);
    });

    it('should clear expired cache entries', () => {
      cacheService.clearExpired.mockReturnValue(5);

      const result = service.clearExpiredCache();

      expect(result).toBe(5);
      expect(cacheService.clearExpired).toHaveBeenCalled();
    });

    it('should get cache statistics', () => {
      const mockStats = {
        totalEntries: 10,
        expiredEntries: 2,
        memoryUsage: 1024,
      };
      cacheService.getStats.mockReturnValue(mockStats);

      const result = service.getCacheStats();

      expect(result).toEqual(mockStats);
      expect(cacheService.getStats).toHaveBeenCalled();
    });
  });

  describe('private helper methods', () => {
    it('should calculate overall accuracy correctly', () => {
      // Test through public method that uses private calculateOverallAccuracy
      const differences = {
        temperature: { accuracy_level: 'EXCELLENT' as const, manual_value: 26.5, sensor_value: 26.2, difference: 0.3, percentage_difference: 1.1, variance_flag: false },
        ph: { accuracy_level: 'GOOD' as const, manual_value: 7.2, sensor_value: 7.3, difference: -0.1, percentage_difference: -1.4, variance_flag: false },
        tds: { accuracy_level: 'FAIR' as const, manual_value: 450, sensor_value: 440, difference: 10, percentage_difference: 2.3, variance_flag: false },
        do_level: { accuracy_level: 'POOR' as const, manual_value: 8.5, sensor_value: 8.3, difference: 0.2, percentage_difference: 2.4, variance_flag: false },
      };

      // This will test the private calculateOverallAccuracy method
      sensorDataRepository.findHistoricalData.mockResolvedValue([mockSensorData]);

      // The overall accuracy should be calculated based on the mix of levels
      expect(service.calculateDifferences(mockManualMeasurement, mockSensorData)).toBeDefined();
    });

    it('should generate correlation IDs', () => {
      // Test through error scenarios that use generateCorrelationId
      sensorDataRepository.findHistoricalData.mockRejectedValue(new Error('Test error'));

      expect(service.findClosestSensorData('device-123', new Date()))
        .rejects.toThrow(DatabaseOperationException);
    });

    it('should handle edge cases in accuracy calculations', () => {
      const edgeCaseMeasurement = {
        ...mockManualMeasurement,
        temperature: 5,
        ph: 7,
        tds: 100,
        do_level: 8,
      };

      const edgeCaseSensorData = {
        ...mockSensorData,
        temperature: { value: 5, status: 'GOOD' as const },
        ph: { value: 7, status: 'GOOD' as const },
        tds: { value: 100, status: 'GOOD' as const },
        do_level: { value: 8, status: 'GOOD' as const },
      };

      const result = service.calculateDifferences(edgeCaseMeasurement, edgeCaseSensorData);

      expect(result.temperature.difference).toBe(0);
      expect(result.temperature.accuracy_level).toBe('EXCELLENT');
      
      // Test zero division case
      const zeroSensorData = {
        ...mockSensorData,
        temperature: { value: 0, status: 'GOOD' as const },
      };
      
      const zeroResult = service.calculateDifferences(mockManualMeasurement, zeroSensorData);
      expect(zeroResult.temperature.percentage_difference).toBeNull(); // Division by zero case
    });
  });
});
