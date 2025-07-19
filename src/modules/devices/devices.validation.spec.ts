import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { DevicesRepository } from './devices.repository';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('DevicesService - Validation Enhancement', () => {
  let service: DevicesService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.USER,
  } as User;

  const mockRepository = {
    checkExists: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findByDeviceId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: DevicesRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Device ID Validation', () => {
    it('should accept valid device ID format', async () => {
      const validDto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: 'Test Device',
      };

      mockRepository.checkExists.mockResolvedValue(false);
      mockRepository.create.mockReturnValue(validDto);
      mockRepository.save.mockResolvedValue({ ...validDto, id: 'device-123' });

      await expect(service.create(validDto, mockUser)).resolves.toBeDefined();
    });

    it('should reject invalid device ID formats', async () => {
      const invalidFormats = [
        'SMNR-123', // Too short
        'SMNR-12345', // Too long
        'SMNR-abc2', // Lowercase letters
        'SMNR-12@3', // Special characters
        'SMR-1234', // Wrong prefix
        'SMNR1234', // Missing dash
        '', // Empty string
        'SMNR-', // Missing suffix
      ];

      for (const invalidId of invalidFormats) {
        const dto: CreateDeviceDto = {
          device_id: invalidId,
          device_name: 'Test Device',
        };

        await expect(service.create(dto, mockUser)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should handle duplicate device ID registration', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: 'Test Device',
      };

      mockRepository.checkExists.mockResolvedValue(true);

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.checkExists).toHaveBeenCalledWith('SMNR-A1B2');
    });
  });

  describe('Device Name Validation', () => {
    it('should reject empty device names', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-E1T1',
        device_name: '',
      };

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject whitespace-only device names', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: '   ',
      };

      mockRepository.checkExists.mockResolvedValue(false);

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept valid device names', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: 'Living Room Aquarium',
      };

      mockRepository.checkExists.mockResolvedValue(false);
      mockRepository.create.mockReturnValue(dto);
      mockRepository.save.mockResolvedValue({ ...dto, id: 'device-123' });

      await expect(service.create(dto, mockUser)).resolves.toBeDefined();
    });
  });

  describe('Optional Fields Validation', () => {
    it('should reject whitespace-only optional fields', async () => {
      const testCases = [
        { location: '   ' },
        { aquarium_size: '   ' },
        { glass_type: '   ' },
      ];

      for (const testCase of testCases) {
        const dto: CreateDeviceDto = {
          device_id: 'SMNR-A1B2',
          device_name: 'Test Device',
          ...testCase,
        };

        mockRepository.checkExists.mockResolvedValue(false);

        await expect(service.create(dto, mockUser)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should accept valid optional fields', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: 'Test Device',
        location: 'Living Room',
        aquarium_size: '50x30x30 cm',
        glass_type: 'Tempered Glass',
        fish_count: 10,
      };

      mockRepository.checkExists.mockResolvedValue(false);
      mockRepository.create.mockReturnValue(dto);
      mockRepository.save.mockResolvedValue({ ...dto, id: 'device-123' });

      await expect(service.create(dto, mockUser)).resolves.toBeDefined();
    });

    it('should reject unreasonably high fish count', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: 'Test Device',
        fish_count: 15000,
      };

      mockRepository.checkExists.mockResolvedValue(false);

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Update Validation', () => {
    const mockDevice = {
      id: 'device-123',
      device_id: 'SMNR-A1B2',
      device_name: 'Test Device',
      user_id: 'user-123',
    };

    beforeEach(() => {
      mockRepository.findByDeviceId.mockResolvedValue(mockDevice);
    });

    it('should validate update data correctly', async () => {
      const updateDto: UpdateDeviceDto = {
        device_name: 'Updated Device Name',
        is_active: true,
      };

      mockRepository.save.mockResolvedValue({ ...mockDevice, ...updateDto });

      await expect(
        service.update('device-123', updateDto, mockUser),
      ).resolves.toBeDefined();
    });

    it('should reject whitespace-only updates', async () => {
      const testCases = [
        { device_name: '   ' },
        { location: '   ' },
        { aquarium_size: '   ' },
        { glass_type: '   ' },
      ];

      for (const testCase of testCases) {
        await expect(
          service.update('device-123', testCase, mockUser),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should validate fish count in updates', async () => {
      const invalidUpdates = [{ fish_count: -1 }, { fish_count: 15000 }];

      for (const update of invalidUpdates) {
        await expect(
          service.update('device-123', update, mockUser),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should validate is_active field type', async () => {
      const invalidUpdate = { is_active: 'true' as any }; // String instead of boolean

      await expect(
        service.update('device-123', invalidUpdate, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during validation', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: 'Test Device',
      };

      mockRepository.checkExists.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.create(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should provide detailed error messages for duplicate registration', async () => {
      const dto: CreateDeviceDto = {
        device_id: 'SMNR-A1B2',
        device_name: 'Test Device',
      };

      mockRepository.checkExists.mockResolvedValue(true);

      try {
        await service.create(dto, mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('already registered');
        expect(error.message).toContain('SMNR-A1B2');
      }
    });
  });
});
