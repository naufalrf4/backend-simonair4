import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ThresholdsService } from './thresholds.service';
import { ThresholdsRepository } from './thresholds.repository';
import { DevicesService } from '@/modules/devices/devices.service';
import { MqttService } from '@/modules/mqtt/mqtt.service';
import { ThresholdRequestDto } from './dto/threshold-request.dto';
import { ThresholdResponseDto } from './dto/threshold-response.dto';
import { ThresholdConfigResponseDto } from './dto/threshold-config-response.dto';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { Threshold } from './entities/threshold.entity';

describe('ThresholdsService', () => {
  let service: ThresholdsService;
  let mockThresholdsRepository: jest.Mocked<ThresholdsRepository>;
  let mockDevicesService: jest.Mocked<DevicesService>;
  let mockMqttService: jest.Mocked<MqttService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.USER,
  } as User;

  const mockAdminUser: User = {
    id: 'admin-123',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: UserRole.ADMIN,
  } as User;

  const mockDevice = {
    id: 'device-123',
    device_id: 'SMNR-1234',
    user_id: 'user-123',
    device_name: 'Test Device',
    location: 'Test Location',
    aquarium_size: 100,
    glass_type: 'tempered',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockThreshold: Threshold = {
    id: 'threshold-123',
    deviceId: 'SMNR-1234',
    thresholdData: {
      ph_min: '6.5',
      ph_max: '8.5',
      tds_min: '200',
      tds_max: '800',
    },
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    updatedBy: 'user-123',
    ackStatus: 'pending',
    ackReceivedAt: null,
    device: mockDevice as any,
    updatedByUser: mockUser,
  };

  beforeEach(async () => {
    const mockThresholdsRepositoryValue = {
      createOrUpdate: jest.fn(),
      findByDeviceId: jest.fn(),
      updateAckStatus: jest.fn(),
    };

    const mockDevicesServiceValue = {
      validateDevice: jest.fn(),
      findOne: jest.fn(),
    };

    const mockMqttServiceValue = {
      publishThresholdsWithValidation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThresholdsService,
        {
          provide: ThresholdsRepository,
          useValue: mockThresholdsRepositoryValue,
        },
        {
          provide: DevicesService,
          useValue: mockDevicesServiceValue,
        },
        {
          provide: MqttService,
          useValue: mockMqttServiceValue,
        },
      ],
    }).compile();

    service = module.get<ThresholdsService>(ThresholdsService);
    mockThresholdsRepository = module.get(ThresholdsRepository);
    mockDevicesService = module.get(DevicesService);
    mockMqttService = module.get(MqttService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendThresholds', () => {
    const validThresholdRequest: ThresholdRequestDto = {
      ph_min: '6.5',
      ph_max: '8.5',
      tds_min: '200',
      tds_max: '800',
      do_min: '5.0',
      do_max: '12.0',
      temp_min: '20.0',
      temp_max: '30.0',
    };

    it('should successfully send thresholds for regular user', async () => {
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.createOrUpdate.mockResolvedValue(mockThreshold);
      mockMqttService.publishThresholdsWithValidation.mockResolvedValue(undefined);

      const result = await service.sendThresholds('SMNR-1234', validThresholdRequest, mockUser);

      expect(result).toBeInstanceOf(ThresholdResponseDto);
      expect(result.device_id).toBe('SMNR-1234');
      expect(result.threshold_data).toEqual({
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
        do_min: '5.0',
        do_max: '12.0',
        temp_min: '20.0',
        temp_max: '30.0',
      });
      
      expect(mockDevicesService.findOne).toHaveBeenCalledWith('SMNR-1234', mockUser);
      expect(mockThresholdsRepository.createOrUpdate).toHaveBeenCalled();
      expect(mockMqttService.publishThresholdsWithValidation).toHaveBeenCalledWith('SMNR-1234', validThresholdRequest);
    });

    it('should successfully send thresholds for admin user', async () => {
      mockDevicesService.validateDevice.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.createOrUpdate.mockResolvedValue(mockThreshold);
      mockMqttService.publishThresholdsWithValidation.mockResolvedValue(undefined);

      const result = await service.sendThresholds('SMNR-1234', validThresholdRequest, mockAdminUser);

      expect(result).toBeInstanceOf(ThresholdResponseDto);
      expect(mockDevicesService.validateDevice).toHaveBeenCalledWith('SMNR-1234');
      expect(mockDevicesService.findOne).not.toHaveBeenCalled();
    });

    it('should handle partial threshold data', async () => {
      const partialThresholdRequest: ThresholdRequestDto = {
        ph_min: '6.5',
        tds_max: '800',
      };
      
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.createOrUpdate.mockResolvedValue({
        ...mockThreshold,
        thresholdData: { ph_min: '6.5', tds_max: '800' },
      });
      mockMqttService.publishThresholdsWithValidation.mockResolvedValue(undefined);

      const result = await service.sendThresholds('SMNR-1234', partialThresholdRequest, mockUser);

      expect(result.threshold_data).toEqual({ ph_min: '6.5', tds_max: '800' });
    });

    it('should handle MQTT publish failure gracefully', async () => {
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.createOrUpdate.mockResolvedValue(mockThreshold);
      mockMqttService.publishThresholdsWithValidation.mockRejectedValue(new Error('MQTT connection failed'));
      mockThresholdsRepository.updateAckStatus.mockResolvedValue(null);

      const result = await service.sendThresholds('SMNR-1234', validThresholdRequest, mockUser);

      expect(result).toBeInstanceOf(ThresholdResponseDto);
      expect(mockThresholdsRepository.updateAckStatus).toHaveBeenCalledWith('SMNR-1234', 'failed');
    });

    it('should throw BadRequestException for empty threshold request', async () => {
      const emptyThresholdRequest: ThresholdRequestDto = {};

      await expect(
        service.sendThresholds('SMNR-1234', emptyThresholdRequest, mockUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid min/max pairs', async () => {
      const invalidThresholdRequest: ThresholdRequestDto = {
        ph_min: '8.0',
        ph_max: '6.0', // Min greater than max
      };

      await expect(
        service.sendThresholds('SMNR-1234', invalidThresholdRequest, mockUser)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized device access', async () => {
      const unauthorizedDevice = { ...mockDevice, user_id: 'other-user' };
      
      mockDevicesService.findOne.mockResolvedValue(unauthorizedDevice as any);

      await expect(
        service.sendThresholds('SMNR-1234', validThresholdRequest, mockUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      mockDevicesService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.sendThresholds('SMNR-9999', validThresholdRequest, mockUser)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCurrentThresholds', () => {
    it('should return current thresholds for existing configuration', async () => {
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.findByDeviceId.mockResolvedValue({
        ...mockThreshold,
        ackStatus: 'success',
      });

      const result = await service.getCurrentThresholds('SMNR-1234', mockUser);

      expect(result).toBeInstanceOf(ThresholdConfigResponseDto);
      expect(result.device_id).toBe('SMNR-1234');
      expect(result.is_active).toBe(true);
      expect(result.thresholds).toEqual(mockThreshold.thresholdData);
    });

    it('should return empty configuration for device without thresholds', async () => {
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.findByDeviceId.mockResolvedValue(null);

      const result = await service.getCurrentThresholds('SMNR-1234', mockUser);

      expect(result).toBeInstanceOf(ThresholdConfigResponseDto);
      expect(result.device_id).toBe('SMNR-1234');
      expect(result.is_active).toBe(false);
      expect(result.thresholds).toEqual({});
    });

    it('should work for admin users', async () => {
      mockDevicesService.validateDevice.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.findByDeviceId.mockResolvedValue(mockThreshold);

      const result = await service.getCurrentThresholds('SMNR-1234', mockAdminUser);

      expect(result).toBeInstanceOf(ThresholdConfigResponseDto);
      expect(mockDevicesService.validateDevice).toHaveBeenCalledWith('SMNR-1234');
    });
  });

  describe('validateThresholdRequestData', () => {
    it('should validate valid threshold pairs', () => {
      const validRequest: ThresholdRequestDto = {
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
      };

      expect(() => {
        (service as any).validateThresholdRequestData(validRequest);
      }).not.toThrow();
    });

    it('should throw for invalid pH range', () => {
      const invalidRequest: ThresholdRequestDto = {
        ph_min: '8.0',
        ph_max: '7.0',
      };

      expect(() => {
        (service as any).validateThresholdRequestData(invalidRequest);
      }).toThrow('pH minimum must be less than pH maximum');
    });

    it('should throw for invalid TDS range', () => {
      const invalidRequest: ThresholdRequestDto = {
        tds_min: '800',
        tds_max: '200',
      };

      expect(() => {
        (service as any).validateThresholdRequestData(invalidRequest);
      }).toThrow('TDS minimum must be less than TDS maximum');
    });

    it('should throw for invalid DO range', () => {
      const invalidRequest: ThresholdRequestDto = {
        do_min: '10.0',
        do_max: '5.0',
      };

      expect(() => {
        (service as any).validateThresholdRequestData(invalidRequest);
      }).toThrow('DO minimum must be less than DO maximum');
    });

    it('should throw for invalid temperature range', () => {
      const invalidRequest: ThresholdRequestDto = {
        temp_min: '30.0',
        temp_max: '20.0',
      };

      expect(() => {
        (service as any).validateThresholdRequestData(invalidRequest);
      }).toThrow('Temperature minimum must be less than temperature maximum');
    });
  });

  describe('transformThresholdData', () => {
    it('should transform valid threshold data', () => {
      const request: ThresholdRequestDto = {
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
        do_min: '5.0',
        do_max: '12.0',
        temp_min: '20.0',
        temp_max: '30.0',
      };

      const result = (service as any).transformThresholdData(request);

      expect(result).toEqual({
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
        do_min: '5.0',
        do_max: '12.0',
        temp_min: '20.0',
        temp_max: '30.0',
      });
    });

    it('should filter out empty and invalid values', () => {
      const request: ThresholdRequestDto = {
        ph_min: '6.5',
        ph_max: '', // Empty string
        tds_min: '200',
        tds_max: undefined, // Undefined
        do_min: null as any, // Null
        do_max: '12.0',
        temp_min: 'invalid', // Invalid number
        temp_max: '30.0',
      };

      const result = (service as any).transformThresholdData(request);

      expect(result).toEqual({
        ph_min: '6.5',
        tds_min: '200',
        do_max: '12.0',
        temp_max: '30.0',
      });
    });

    it('should handle partial threshold data', () => {
      const request: ThresholdRequestDto = {
        ph_min: '6.5',
        tds_max: '800',
      };

      const result = (service as any).transformThresholdData(request);

      expect(result).toEqual({
        ph_min: '6.5',
        tds_max: '800',
      });
    });
  });

  describe('updateAckStatus', () => {
    it('should update acknowledgment status', async () => {
      mockThresholdsRepository.updateAckStatus.mockResolvedValue(null);

      await service.updateAckStatus('SMNR-1234', 'success');

      expect(mockThresholdsRepository.updateAckStatus).toHaveBeenCalledWith('SMNR-1234', 'success');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockDevicesService.findOne.mockResolvedValue(mockDevice as any);
      mockThresholdsRepository.createOrUpdate.mockRejectedValue(new Error('Database error'));

      await expect(
        service.sendThresholds('SMNR-1234', { ph_min: '7.0' }, mockUser)
      ).rejects.toThrow('Database error');
    });

    it('should handle device service errors', async () => {
      mockDevicesService.findOne.mockRejectedValue(new Error('Device service error'));

      await expect(
        service.sendThresholds('SMNR-1234', { ph_min: '7.0' }, mockUser)
      ).rejects.toThrow('Device service error');
    });

    it('should validate device ownership with proper error handling', async () => {
      mockDevicesService.findOne.mockRejectedValue(new Error('Network error'));

      await expect(
        service.getCurrentThresholds('SMNR-1234', mockUser)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
