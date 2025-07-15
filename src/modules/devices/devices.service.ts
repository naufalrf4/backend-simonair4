import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { DevicesRepository } from './devices.repository';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly devicesRepository: DevicesRepository,
  ) {}

  async create(createDeviceDto: CreateDeviceDto, user: User): Promise<Device> {
    await this.validateRegistration(createDeviceDto.device_id);

    const device = this.devicesRepository.create({
      ...createDeviceDto,
      user_id: user.id,
      is_active: true,
    });

    const savedDevice = await this.devicesRepository.save(device);
    this.logger.log(`Device with ID "${savedDevice.device_id}" created by User ID "${user.id}"`);
    // Optionally trigger MQTT subscription here
    return savedDevice;
  }

  async validateRegistration(deviceId: string): Promise<void> {
    const deviceExists = await this.devicesRepository.checkExists(deviceId);
    if (deviceExists) {
      throw new ConflictException(`Device with ID "${deviceId}" already exists.`);
    }
  }

  async getDevices(options: any): Promise<{ devices: Device[], total: number }> {
    const [devices, total] = await this.devicesRepository.findWithPagination(options);
    return { devices, total };
  }

  async findAll(user: User): Promise<Device[]> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERUSER) {
      return this.devicesRepository.find({ relations: ['user'] });
    }
    return this.devicesRepository.find({ where: { user_id: user.id }, relations: ['user'] });
  }

  async findOne(deviceId: string, user?: User): Promise<Device> {
    const device = await this.devicesRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new NotFoundException(`Device with ID "${deviceId}" not found`);
    }
    if (user && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERUSER && device.user_id !== user.id) {
      throw new ForbiddenException('You are not authorized to access this device');
    }
    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto, user: User): Promise<Device> {
    const device = await this.findOne(id, user);
    Object.assign(device, updateDeviceDto);
    const updatedDevice = await this.devicesRepository.save(device);
    this.logger.log(`Device with ID "${id}" updated by User ID "${user.id}"`);
    return updatedDevice;
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
      throw new ForbiddenException(`Device with ID "${deviceId}" is not active`);
    }
    return device;
  }
}
