import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger, ForbiddenException } from '@nestjs/common';
import { ManualMeasurementsService } from './manual-measurements.service';
import { ManualMeasurementsRepository } from '../repositories/manual-measurements.repository';
import { MeasurementComparisonService } from './measurement-comparison.service';
import { DevicesService } from '../../devices/devices.service';
import { SensorsService } from '../../sensors/sensors.service';
import { CreateManualMeasurementDto } from '../dto/create-manual-measurement.dto';
import {
  DeviceAccessDeniedException,
  DatabaseOperationException,
} from '../exceptions/manual-measurement.exceptions';

describe('ManualMeasurementsService', () => {
  let service: ManualMeasurementsService;
  let repository: jest.Mocked<ManualMeasurementsRepository>;
  let comparisonService: jest.Mocked<MeasurementComparisonService>;
  let devicesService: jest.Mocked<DevicesService>;
  let configService: jest.Mocked<ConfigService>;

  // Test data
  const mockUserId = 'user-123';
  const mockDeviceId = 'device-456';
  const mockMeasurementId = 'measurement-789';

  const mockMeasurement = {
    id: mockMeasurementId,
    device_id: mockDeviceId,
    measured_by: mockUserId,
    temperature: 26.5,
    ph: 7.2,
    tds: 450,
    do_level: 8.5,
    notes: 'Test measurement',
    measurement_timestamp: new Date('2024-01-15T10:30:00Z'),
    created_at: new Date('2024-01-15T10:31:00Z'),
  };

  const mockCreateDto: CreateManualMeasurementDto = {
    temperature: 26.5,
    ph: 7.2,
    tds: 450,
    do_level: 8.5,
    notes: 'Test measurement',
    measurement_timestamp: '2024-01-15T10:30:00Z',
    compare_with_sensor: true,
  };

  const mockComparisonReport = {
    manual_measurement_id: mockMeasurementId,
    device_id: mockDeviceId,
    comparison_timestamp: new Date('2024-01-15T10:30:15Z'),
    sensor_data_timestamp: new Date('2024-01-15T10:28:00Z'),
    time_window_minutes: 5,
    temperature: {
      manual_value: 26.5,
      sensor_value: 26.3,
      difference: 0.2,
      percentage_difference: 0.8,
      accuracy_level: 'EXCELLENT' as const,
      variance_flag: false,
    },
    ph: {
      manual_value: 7.2,
      sensor_value: 7.1,
      difference: 0.1,
      percentage_difference: 1.4,
      accuracy_level: 'EXCELLENT' as const,
      variance_flag: false,
    },
    tds: {
      manual_value: 450,
      sensor_value: 445,
      difference: 5,
      percentage_difference: 1.1,
      accuracy_level: 'EXCELLENT' as const,
      variance_flag: false,
    },
    do_level: {
      manual_value: 8.5,
      sensor_value: 8.4,
      difference: 0.1,
      percentage_difference: 1.2,
      accuracy_level: 'EXCELLENT' as const,
      variance_flag: false,
    },
    overall_accuracy: 'GOOD' as const,
    accuracy_score: 95.2,
    variance_count: 0,
    notes: 'Good accuracy',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualMeasurementsService,
        {
          provide: ManualMeasurementsRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByDeviceId: jest.fn(),
            checkDuplicates: jest.fn(),
          },
        },
        {
          provide: MeasurementComparisonService,
          useValue: {
            generateComparisonReport: jest.fn(),
          },
        },
        {
          provide: DevicesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: SensorsService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ManualMeasurementsService>(ManualMeasurementsService);
    repository = module.get(ManualMeasurementsRepository);
    comparisonService = module.get(MeasurementComparisonService);
    devicesService = module.get(DevicesService);
    configService = module.get(ConfigService);

    // Silence logger during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    beforeEach(() => {
      devicesService.findOne.mockResolvedValue({ id: mockDeviceId, user_id: mockUserId } as any);
      repository.checkDuplicates.mockResolvedValue({ exists: false });
      repository.create.mockResolvedValue(mockMeasurement as any);
      configService.get.mockReturnValue(false); // Don't allow duplicates by default
    });

    it('should create a manual measurement successfully', async () => {
      const result = await service.create(mockUserId, mockDeviceId, mockCreateDto);

      expect(result.measurement).toEqual(mockMeasurement);
      expect(repository.create).toHaveBeenCalledWith(mockCreateDto, mockUserId, mockDeviceId);
    });

    it('should create measurement with comparison when requested', async () => {
      comparisonService.generateComparisonReport.mockResolvedValue(mockComparisonReport as any);

      const result = await service.create(mockUserId, mockDeviceId, mockCreateDto);

      expect(result.measurement).toEqual(mockMeasurement);
      expect(result.comparison).toBeDefined();
      expect(comparisonService.generateComparisonReport).toHaveBeenCalledWith(mockMeasurement);
    });

    it('should handle comparison errors gracefully', async () => {
      comparisonService.generateComparisonReport.mockRejectedValue(new Error('Comparison failed'));

      const result = await service.create(mockUserId, mockDeviceId, mockCreateDto);

      expect(result.measurement).toEqual(mockMeasurement);
      expect(result.comparison).toBeUndefined();
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should throw DeviceAccessDeniedException when device access is denied', async () => {
      devicesService.findOne.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(
        service.create(mockUserId, mockDeviceId, mockCreateDto),
      ).rejects.toThrow(DeviceAccessDeniedException);
    });

    it('should throw DatabaseOperationException on repository error', async () => {
      repository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockUserId, mockDeviceId, mockCreateDto),
      ).rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(mockMeasurement as any);
      devicesService.findOne.mockResolvedValue({ id: mockDeviceId, user_id: mockUserId } as any);
    });

    it('should return measurement when found and access is allowed', async () => {
      const result = await service.findOne(mockUserId, mockMeasurementId);

      expect(result).toEqual(mockMeasurement);
      expect(repository.findById).toHaveBeenCalledWith(mockMeasurementId, true);
    });

    it('should throw DeviceAccessDeniedException when device access is denied', async () => {
      devicesService.findOne.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(
        service.findOne(mockUserId, mockMeasurementId),
      ).rejects.toThrow(DeviceAccessDeniedException);
    });
  });

  describe('validateMeasurementValues', () => {
    it('should return valid for measurement within acceptable ranges', async () => {
      const result = await service.validateMeasurementValues(mockCreateDto);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return errors for values outside acceptable ranges', async () => {
      const dto = { ...mockCreateDto, temperature: -10 }; // Below acceptable range

      const result = await service.validateMeasurementValues(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors.temperature).toBeDefined();
    });

    it('should return error for future timestamps', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const dto = { ...mockCreateDto, measurement_timestamp: futureDate.toISOString() };

      const result = await service.validateMeasurementValues(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors.measurement_timestamp).toBeDefined();
    });

    it('should return error when no sensor values are provided', async () => {
      const dto = {
        ...mockCreateDto,
        temperature: undefined,
        ph: undefined,
        tds: undefined,
        do_level: undefined,
      };

      const result = await service.validateMeasurementValues(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors.values).toBeDefined();
    });
  });

  describe('checkForDuplicates', () => {
    const testTimestamp = new Date('2024-01-15T10:30:00Z');

    it('should return no duplicates when none exist', async () => {
      repository.checkDuplicates.mockResolvedValue({ exists: false });

      const result = await service.checkForDuplicates(mockDeviceId, testTimestamp);

      expect(result.exists).toBe(false);
      expect(repository.checkDuplicates).toHaveBeenCalledWith(mockDeviceId, testTimestamp, 5);
    });

    it('should return duplicate info when duplicates exist', async () => {
      const existingMeasurement = {
        ...mockMeasurement,
        measurement_timestamp: new Date('2024-01-15T10:28:00Z'),
      };
      
      repository.checkDuplicates.mockResolvedValue({
        exists: true,
        existingMeasurement: existingMeasurement as any,
      });

      const result = await service.checkForDuplicates(mockDeviceId, testTimestamp);

      expect(result.exists).toBe(true);
      expect(result.existingMeasurement).toEqual(existingMeasurement);
      expect(result.timeDifference).toBe(2); // 2 minutes difference
      expect(result.recommendation).toBeDefined();
    });

    it('should handle repository errors gracefully', async () => {
      repository.checkDuplicates.mockRejectedValue(new Error('Database error'));

      const result = await service.checkForDuplicates(mockDeviceId, testTimestamp);

      expect(result.exists).toBe(false); // Should default to false on error
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('private helper methods', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = service['generateCorrelationId']();
      const id2 = service['generateCorrelationId']();

      expect(id1).toMatch(/^mm_\d+_\w{9}$/);
      expect(id2).toMatch(/^mm_\d+_\w{9}$/);
      expect(id1).not.toBe(id2);
    });

    it('should map comparison report to DTO correctly', () => {
      const result = service['mapComparisonReportToDto'](mockComparisonReport);

      expect(result.manual_measurement_id).toBe(mockComparisonReport.manual_measurement_id);
      expect(result.device_id).toBe(mockComparisonReport.device_id);
    });
  });
});
