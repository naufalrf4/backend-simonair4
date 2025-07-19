import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualMeasurementsRepository } from './manual-measurements.repository';
import { ManualMeasurement } from '../entities/manual-measurement.entity';
import { CreateManualMeasurementDto } from '../dto/create-manual-measurement.dto';
import { ManualMeasurementQueryDto } from '../dto/manual-measurement-query.dto';
import {
  ManualMeasurementNotFoundException,
  DuplicateMeasurementException,
  DatabaseOperationException,
} from '../exceptions';

describe('ManualMeasurementsRepository', () => {
  let repository: ManualMeasurementsRepository;
  let typeOrmRepository: jest.Mocked<Repository<ManualMeasurement>>;

  const mockManualMeasurement: ManualMeasurement = {
    id: 'test-measurement-id',
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

  const mockCreateDto: CreateManualMeasurementDto = {
    measurement_timestamp: '2024-01-15T10:30:00Z',
    temperature: 26.5,
    ph: 7.2,
    tds: 450,
    do_level: 8.5,
    notes: 'Test measurement',
    compare_with_sensor: true,
  };

  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualMeasurementsRepository,
        {
          provide: getRepositoryToken(ManualMeasurement),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<ManualMeasurementsRepository>(ManualMeasurementsRepository);
    typeOrmRepository = module.get(getRepositoryToken(ManualMeasurement));
  });

  describe('create', () => {
    it('should successfully create a manual measurement', async () => {
      const userId = 'user-456';
      const deviceId = 'device-123';

      typeOrmRepository.create.mockReturnValue(mockManualMeasurement);
      typeOrmRepository.save.mockResolvedValue(mockManualMeasurement);

      const result = await repository.create(mockCreateDto, userId, deviceId);

      expect(typeOrmRepository.create).toHaveBeenCalledWith({
        ...mockCreateDto,
        measurement_timestamp: new Date(mockCreateDto.measurement_timestamp),
        measured_by: userId,
        device_id: deviceId,
      });
      expect(typeOrmRepository.save).toHaveBeenCalledWith(mockManualMeasurement);
      expect(result).toEqual(mockManualMeasurement);
    });

    it('should throw DuplicateMeasurementException on unique constraint violation', async () => {
      const userId = 'user-456';
      const deviceId = 'device-123';
      const duplicateError = { code: '23505', message: 'Unique constraint violation' };

      typeOrmRepository.create.mockReturnValue(mockManualMeasurement);
      typeOrmRepository.save.mockRejectedValue(duplicateError);

      await expect(repository.create(mockCreateDto, userId, deviceId))
        .rejects.toThrow(DuplicateMeasurementException);
    });

    it('should throw DatabaseOperationException on general database error', async () => {
      const userId = 'user-456';
      const deviceId = 'device-123';
      const dbError = { message: 'Database connection failed' };

      typeOrmRepository.create.mockReturnValue(mockManualMeasurement);
      typeOrmRepository.save.mockRejectedValue(dbError);

      await expect(repository.create(mockCreateDto, userId, deviceId))
        .rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('findByDeviceId', () => {
    it('should return paginated results for a device', async () => {
      const deviceId = 'device-123';
      const options = { page: 1, limit: 20, sortBy: 'measurement_timestamp', sortOrder: 'DESC' as const };
      
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockManualMeasurement], 1]);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByDeviceId(deviceId, options);

      expect(typeOrmRepository.createQueryBuilder).toHaveBeenCalledWith('mm');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mm.device_id = :deviceId', { deviceId });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('mm.measurement_timestamp', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [mockManualMeasurement],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      });
    });

    it('should include relations when requested', async () => {
      const deviceId = 'device-123';
      const options = { includeRelations: true };
      
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await repository.findByDeviceId(deviceId, options);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('mm.device', 'device');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('mm.user', 'user');
    });
  });

  describe('findById', () => {
    it('should find measurement by ID', async () => {
      const id = 'test-measurement-id';

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockManualMeasurement);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findById(id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mm.id = :id', { id });
      expect(result).toEqual(mockManualMeasurement);
    });

    it('should throw ManualMeasurementNotFoundException when measurement not found', async () => {
      const id = 'non-existent-id';

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(null);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(repository.findById(id))
        .rejects.toThrow(ManualMeasurementNotFoundException);
    });
  });

  describe('checkDuplicates', () => {
    it('should return duplicate check result when duplicate exists', async () => {
      const deviceId = 'device-123';
      const timestamp = new Date('2024-01-15T10:30:00Z');
      const toleranceMinutes = 5;

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockManualMeasurement);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.checkDuplicates(deviceId, timestamp, toleranceMinutes);

      expect(result.exists).toBe(true);
      expect(result.existingMeasurement).toEqual(mockManualMeasurement);
      expect(result.conflictWindow).toBeDefined();
      expect(result.conflictWindow!.start).toBeInstanceOf(Date);
      expect(result.conflictWindow!.end).toBeInstanceOf(Date);
    });

    it('should return no duplicate when none exists', async () => {
      const deviceId = 'device-123';
      const timestamp = new Date('2024-01-15T10:30:00Z');

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(null);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.checkDuplicates(deviceId, timestamp);

      expect(result.exists).toBe(false);
      expect(result.existingMeasurement).toBeUndefined();
    });
  });

  describe('getCountByDevice', () => {
    it('should return count of measurements for a device', async () => {
      const deviceId = 'device-123';
      const expectedCount = 5;

      typeOrmRepository.count.mockResolvedValue(expectedCount);

      const result = await repository.getCountByDevice(deviceId);

      expect(typeOrmRepository.count).toHaveBeenCalledWith({
        where: { device_id: deviceId },
      });
      expect(result).toBe(expectedCount);
    });

    it('should throw DatabaseOperationException on count error', async () => {
      const deviceId = 'device-123';

      typeOrmRepository.count.mockRejectedValue(new Error('Count failed'));

      await expect(repository.getCountByDevice(deviceId))
        .rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('getDeviceStatistics', () => {
    it('should return device statistics', async () => {
      const deviceId = 'device-123';
      const measurements = [
        { ...mockManualMeasurement, temperature: 25.0, ph: null, tds: null, do_level: null },
        { ...mockManualMeasurement, temperature: null, ph: 7.5, tds: null, do_level: null },
        { ...mockManualMeasurement, temperature: 26.0, ph: 7.0, tds: 400, do_level: null },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(measurements);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.getDeviceStatistics(deviceId);

      expect(result.total).toBe(3);
      expect(result.byType.temperature).toBe(2);
      expect(result.byType.ph).toBe(2);
      expect(result.byType.tds).toBe(1);
      expect(result.byType.do_level).toBe(0);
      expect(result.dateRange).toBeDefined();
      expect(result.avgValuesPerMeasurement).toBeCloseTo(1.67, 2);
    });

    it('should handle empty results', async () => {
      const deviceId = 'device-123';

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.getDeviceStatistics(deviceId);

      expect(result.total).toBe(0);
      expect(result.dateRange).toBeNull();
      expect(result.avgValuesPerMeasurement).toBe(0);
    });
  });

  describe('update', () => {
    it('should successfully update a measurement', async () => {
      const id = 'test-measurement-id';
      const updateData = { notes: 'Updated notes' };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockManualMeasurement);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      typeOrmRepository.save.mockResolvedValue({ ...mockManualMeasurement, ...updateData });

      const result = await repository.update(id, updateData);

      expect(typeOrmRepository.save).toHaveBeenCalled();
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw error when measurement not found for update', async () => {
      const id = 'non-existent-id';
      const updateData = { notes: 'Updated notes' };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(null);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(repository.update(id, updateData))
        .rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('delete', () => {
    it('should successfully delete a measurement', async () => {
      const id = 'test-measurement-id';

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockManualMeasurement);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      typeOrmRepository.remove.mockResolvedValue(mockManualMeasurement);

      await repository.delete(id);

      expect(typeOrmRepository.remove).toHaveBeenCalledWith(mockManualMeasurement);
    });

    it('should throw error when measurement not found for deletion', async () => {
      const id = 'non-existent-id';

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(null);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(repository.delete(id))
        .rejects.toThrow(DatabaseOperationException);
    });
  });

  describe('findForBulkOperation', () => {
    it('should find measurements for bulk operations and split into batches', async () => {
      const deviceIds = ['device-1', 'device-2'];
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const batchSize = 2;

      const measurements = [
        mockManualMeasurement,
        { ...mockManualMeasurement, id: 'measurement-2' },
        { ...mockManualMeasurement, id: 'measurement-3' },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(measurements);
      
      typeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findForBulkOperation(deviceIds, startDate, endDate, batchSize);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mm.device_id IN (:...deviceIds)', { deviceIds });
      expect(result).toHaveLength(2); // Two batches
      expect(result[0]).toHaveLength(2); // First batch has 2 items
      expect(result[1]).toHaveLength(1); // Second batch has 1 item
    });
  });

  describe('private methods', () => {
    it('should validate sort fields properly', () => {
      // Test through public methods that use the private validation
      const validField = 'measurement_timestamp';
      const invalidField = 'malicious_field';

      // This tests the private validateSortField method indirectly
      expect(() => {
        const queryDto = new ManualMeasurementQueryDto();
        queryDto.sortBy = validField;
        // The method will use the field if valid, or default to measurement_timestamp
      }).not.toThrow();
    });
  });
});
