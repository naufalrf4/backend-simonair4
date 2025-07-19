import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DevicesRepository } from './devices.repository';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly devicesRepository: DevicesRepository) {}

  async create(createDeviceDto: CreateDeviceDto, user: User): Promise<Device> {
    try {
      // Validate device registration before creating
      await this.validateRegistration(createDeviceDto.device_id);

      // Additional validation for device data
      this.validateDeviceData(createDeviceDto);

      const device = this.devicesRepository.create({
        ...createDeviceDto,
        user_id: user.id,
        is_active: true,
      });

      const savedDevice = await this.devicesRepository.save(device);
      this.logger.log(
        `Device with ID "${savedDevice.device_id}" created by User ID "${user.id}"`,
      );

      return savedDevice;
    } catch (error) {
      // Log the error for debugging
      this.logger.error(
        `Failed to create device with ID "${createDeviceDto.device_id}": ${error.message}`,
        error.stack,
      );

      // Re-throw the error to maintain proper error handling flow
      throw error;
    }
  }

  async validateRegistration(deviceId: string): Promise<void> {
    // Validate device ID format first
    if (!deviceId) {
      throw new BadRequestException('Device ID is required for registration');
    }

    // Check if device ID matches the required format
    const deviceIdPattern = /^SMNR-[A-Z0-9]{4}$/;
    if (!deviceIdPattern.test(deviceId)) {
      throw new BadRequestException(
        'Device ID must be in the format SMNR-XXXX where XXXX is exactly 4 alphanumeric characters (A-Z, 0-9)',
      );
    }

    try {
      // Check if device already exists
      const deviceExists = await this.devicesRepository.checkExists(deviceId);
      if (deviceExists) {
        throw new ConflictException(
          `Device with ID "${deviceId}" is already registered. Please use a different device ID or contact support if this is your device.`,
        );
      }
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle database errors
      this.logger.error(
        `Database error during device registration validation for ID "${deviceId}": ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Unable to validate device registration. Please try again later.',
      );
    }
  }

  private validateDeviceData(createDeviceDto: CreateDeviceDto): void {
    // Additional business logic validation beyond class-validator

    // Validate device name is not just whitespace
    if (
      createDeviceDto.device_name &&
      createDeviceDto.device_name.trim().length === 0
    ) {
      throw new BadRequestException(
        'Device name cannot be empty or contain only whitespace',
      );
    }

    // Validate optional fields if provided
    if (
      createDeviceDto.location &&
      createDeviceDto.location.trim().length === 0
    ) {
      throw new BadRequestException(
        'Location cannot be empty or contain only whitespace when provided',
      );
    }

    if (
      createDeviceDto.aquarium_size &&
      createDeviceDto.aquarium_size.trim().length === 0
    ) {
      throw new BadRequestException(
        'Aquarium size cannot be empty or contain only whitespace when provided',
      );
    }

    if (
      createDeviceDto.glass_type &&
      createDeviceDto.glass_type.trim().length === 0
    ) {
      throw new BadRequestException(
        'Glass type cannot be empty or contain only whitespace when provided',
      );
    }

    // Validate fish count is reasonable
    if (
      createDeviceDto.fish_count !== undefined &&
      createDeviceDto.fish_count > 10000
    ) {
      throw new BadRequestException(
        'Fish count seems unreasonably high. Please verify the number.',
      );
    }
  }

  async getDevices(options: any): Promise<{ devices: any[]; total: number }> {
    const [devices, total] =
      await this.devicesRepository.findWithPagination(options);

    const mappedDevices = devices.map((device) => {
      const latestSensorData = (device as any).latestSensorData;

      // Format latest sensor data if it exists
      const formattedLatestSensorData = latestSensorData
        ? {
            time: latestSensorData.time,
            timestamp: latestSensorData.timestamp,
            temperature: latestSensorData.temperature,
            ph: latestSensorData.ph,
            tds: latestSensorData.tds,
            do_level: latestSensorData.do_level,
          }
        : null;

      const user = device.user
        ? {
            id: device.user.id,
            name: device.user.full_name,
          }
        : null;

      return {
        id: device.id,
        device_id: device.device_id,
        device_name: device.device_name,
        location: device.location,
        aquarium_size: device.aquarium_size,
        glass_type: device.glass_type,
        fish_count: device.fish_count,
        is_active: device.is_active,
        last_seen: device.last_seen,
        created_at: device.created_at,
        user,
        latestSensorData: formattedLatestSensorData,
      };
    });

    return { devices: mappedDevices, total };
  }

  async findAll(user: User): Promise<Device[]> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return this.devicesRepository.find({ relations: ['user'] });
    }
    return this.devicesRepository.find({
      where: { user_id: user.id },
      relations: ['user'],
    });
  }

  async findOne(deviceId: string, user?: User): Promise<Device> {
    const device = await this.devicesRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new NotFoundException(`Device with ID "${deviceId}" not found`);
    }
    if (
      user &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPERUSER &&
      device.user_id !== user.id
    ) {
      throw new ForbiddenException(
        'You are not authorized to access this device',
      );
    }
    return device;
  }

  async update(
    id: string,
    updateDeviceDto: UpdateDeviceDto,
    user: User,
  ): Promise<Device> {
    try {
      const device = await this.findOne(id, user);

      // Validate update data
      this.validateUpdateData(updateDeviceDto);

      Object.assign(device, updateDeviceDto);
      const updatedDevice = await this.devicesRepository.save(device);
      this.logger.log(`Device with ID "${id}" updated by User ID "${user.id}"`);
      return updatedDevice;
    } catch (error) {
      // Log the error for debugging
      this.logger.error(
        `Failed to update device with ID "${id}": ${error.message}`,
        error.stack,
      );

      // Re-throw the error to maintain proper error handling flow
      throw error;
    }
  }

  private validateUpdateData(updateDeviceDto: UpdateDeviceDto): void {
    // Additional business logic validation for updates

    // Validate device name is not just whitespace if provided
    if (updateDeviceDto.device_name !== undefined) {
      if (typeof updateDeviceDto.device_name !== 'string') {
        throw new BadRequestException('Device name must be a string');
      }
      if (updateDeviceDto.device_name.trim().length === 0) {
        throw new BadRequestException(
          'Device name cannot be empty or contain only whitespace',
        );
      }
    }

    // Validate optional fields if provided
    if (
      updateDeviceDto.location !== undefined &&
      updateDeviceDto.location !== null
    ) {
      if (typeof updateDeviceDto.location !== 'string') {
        throw new BadRequestException('Location must be a string');
      }
      if (updateDeviceDto.location.trim().length === 0) {
        throw new BadRequestException(
          'Location cannot be empty or contain only whitespace when provided',
        );
      }
    }

    if (
      updateDeviceDto.aquarium_size !== undefined &&
      updateDeviceDto.aquarium_size !== null
    ) {
      if (typeof updateDeviceDto.aquarium_size !== 'string') {
        throw new BadRequestException('Aquarium size must be a string');
      }
      if (updateDeviceDto.aquarium_size.trim().length === 0) {
        throw new BadRequestException(
          'Aquarium size cannot be empty or contain only whitespace when provided',
        );
      }
    }

    if (
      updateDeviceDto.glass_type !== undefined &&
      updateDeviceDto.glass_type !== null
    ) {
      if (typeof updateDeviceDto.glass_type !== 'string') {
        throw new BadRequestException('Glass type must be a string');
      }
      if (updateDeviceDto.glass_type.trim().length === 0) {
        throw new BadRequestException(
          'Glass type cannot be empty or contain only whitespace when provided',
        );
      }
    }

    // Validate fish count is reasonable if provided
    if (updateDeviceDto.fish_count !== undefined) {
      if (
        typeof updateDeviceDto.fish_count !== 'number' ||
        !Number.isInteger(updateDeviceDto.fish_count)
      ) {
        throw new BadRequestException('Fish count must be an integer');
      }
      if (updateDeviceDto.fish_count < 0) {
        throw new BadRequestException('Fish count cannot be negative');
      }
      if (updateDeviceDto.fish_count > 10000) {
        throw new BadRequestException(
          'Fish count seems unreasonably high. Please verify the number.',
        );
      }
    }

    // Validate is_active field if provided
    if (updateDeviceDto.is_active !== undefined) {
      if (typeof updateDeviceDto.is_active !== 'boolean') {
        throw new BadRequestException(
          'Active status must be a boolean value (true or false)',
        );
      }
    }
  }

  async remove(id: string, user: User): Promise<void> {
    const device = await this.findOne(id, user);
    await this.devicesRepository.remove(device);
    this.logger.log(`Device with ID "${id}" removed by User ID "${user.id}"`);
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    await this.devicesRepository.updateLastSeen(deviceId);
    this.logger.log(`Device with ID "${deviceId}" last seen updated.`);
  }

  async validateDevice(deviceId: string): Promise<Device> {
    const device = await this.devicesRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new NotFoundException(`Device with ID "${deviceId}" not found`);
    }
    if (!device.is_active) {
      throw new ForbiddenException(
        `Device with ID "${deviceId}" is not active`,
      );
    }
    return device;
  }
}
