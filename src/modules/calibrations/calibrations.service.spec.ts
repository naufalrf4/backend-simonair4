import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalibrationsService } from './calibrations.service';
import { DevicesService } from '@/modules/devices/devices.service';
import { MqttService } from '@/modules/mqtt/mqtt.service';
import { CalibrationRequestDto } from './dto/calibration-request.dto';
import { CalibrationResponseDto } from './dto/calibration-response.dto';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { Calibration } from './entities/calibration.entity';
import { Device } from '../devices/entities/device.entity';
import { Repository } from 'typeorm';

// Mock full entities to avoid type errors
const mockUser: User = {
  id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
  role: UserRole.USER,
  social_provider: null,
  social_id: null,
  email_verified: true,
  reset_token: null,
  reset_token_expires: null,
  verification_token: null,
  last_login: new Date(),
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  devices: [],
  calibrations: [],
  water_quality_events: [],
  manual_measurements: [],
  updatedThresholds: [],
  get device_count() {
    return this.devices.length;
  },
  get is_social_login() {
    return !!this.social_provider;
  },
};

const mockDevice: Device = {
  id: 'd1e2f3a4-b5c6-7890-1234-567890abcdef',
  device_id: 'SMNR-1234',
  user_id: mockUser.id,
  device_name: 'Test Device',
  location: 'Test Location',
  aquarium_size: '50L',
  glass_type: 'Standard',
  fish_count: 10,
  last_seen: new Date(),
  is_active: true,
  created_at: new Date(),
  user: mockUser,
  sensor_data: [],
  fish_growth: [],
  calibrations: [],
  water_quality_events: [],
  feed_data: [],
  manual_measurements: [],
  threshold: null as any, // or mock threshold
};

const mockCalibration: Calibration = {
  id: 'c1a2b3c4-d5e6-f789-0123-456789abcdef',
  device_id: mockDevice.device_id,
  sensor_type: 'ph',
  calibration_data: { mid: 7, v: 2500 },
  applied_at: new Date(),
  applied_by: mockUser.id,
  mqtt_published_at: null,
  mqtt_ack_received_at: null,
  mqtt_ack_status: 'pending',
  mqtt_retry_count: 0,
  device: mockDevice,
  applied_by_user: mockUser,
};

describe('CalibrationsService', () => {
  let service: CalibrationsService;
  let calibrationRepository: Repository<Calibration>;
  let devicesService: DevicesService;
  let mqttService: MqttService;

  const mockCalibrationRepository = {
    create: jest.fn().mockReturnValue(mockCalibration),
    save: jest.fn().mockResolvedValue(mockCalibration),
    findOne: jest.fn().mockResolvedValue(mockCalibration),
    findAndCount: jest.fn().mockResolvedValue([[mockCalibration], 1]),
  };

  const mockDevicesService = {
    findOne: jest.fn().mockResolvedValue(mockDevice),
  };

  const mockMqttService = {
    publishCalibrationWithValidation: jest.fn().mockResolvedValue(undefined),
    publishWithRetry: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationsService,
        {
          provide: getRepositoryToken(Calibration),
          useValue: mockCalibrationRepository,
        },
        {
          provide: DevicesService,
          useValue: mockDevicesService,
        },
        {
          provide: MqttService,
          useValue: mockMqttService,
        },
      ],
    }).compile();

    service = module.get<CalibrationsService>(CalibrationsService);
    calibrationRepository = module.get<Repository<Calibration>>(
      getRepositoryToken(Calibration),
    );
    devicesService = module.get<DevicesService>(DevicesService);
    mqttService = module.get<MqttService>(MqttService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendCalibration', () => {
    const dto: CalibrationRequestDto = {
      sensor_type: 'ph',
      calibration_data: { mid: 7, v: 2500 },
    };

    it('should successfully send calibration for an owned device', async () => {
      const result = await service.sendCalibration(
        mockDevice.device_id,
        dto,
        mockUser,
      );

      expect(devicesService.findOne).toHaveBeenCalledWith(mockDevice.device_id);
      expect(calibrationRepository.save).toHaveBeenCalled();
      expect(mqttService.publishCalibrationWithValidation).toHaveBeenCalled();
      expect(result).toBeInstanceOf(CalibrationResponseDto);
      expect(result.device_id).toBe(mockDevice.device_id);
    });

    it('should throw UnauthorizedException if user does not own the device', async () => {
      const anotherUser: User = {
        ...mockUser,
        id: 'another-user-id',
        get device_count() {
          return this.devices.length;
        },
        get is_social_login() {
          return !!this.social_provider;
        },
      };
      await expect(
        service.sendCalibration(mockDevice.device_id, dto, anotherUser),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid sensor type', async () => {
      const invalidDto = { ...dto, sensor_type: 'invalid' };
      await expect(
        service.sendCalibration(mockDevice.device_id, invalidDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCalibrationHistory', () => {
    it('should return paginated calibration history', async () => {
      const result = await service.getCalibrationHistory(
        mockDevice.device_id,
        mockUser,
        1,
        10,
      );

      expect(result.total).toBe(1);
      expect(result.calibrations).toHaveLength(1);
      expect(result.calibrations[0]).toBeInstanceOf(CalibrationResponseDto);
      expect(result.calibrations[0].id).toEqual(mockCalibration.id);
    });
  });

  describe('apply', () => {
    it('should apply a calibration and publish to MQTT', async () => {
      const result = await service.apply(mockCalibration.id, mockUser);

      expect(calibrationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCalibration.id },
      });
      expect(result.applied_by).toEqual(mockUser.id);
      expect(mqttService.publishWithRetry).toHaveBeenCalled();
    });

    it('should throw NotFoundException if calibration does not exist', async () => {
      mockCalibrationRepository.findOne.mockResolvedValue(null);
      await expect(service.apply('non-existent-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
