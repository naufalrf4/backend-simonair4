import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WaterQualityEvent } from './entities/water-quality-event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { User } from '../users/entities/user.entity';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(WaterQualityEvent)
    private readonly eventRepository: Repository<WaterQualityEvent>,
    private readonly devicesService: DevicesService,
  ) {}

  async create(createEventDto: CreateEventDto, user?: User): Promise<WaterQualityEvent> {
    if (user) {
      const device = await this.devicesService.findOne(createEventDto.device_id, user);
      if (!device) {
        throw new UnauthorizedException('You are not authorized to create an event for this device.');
      }
    }

    const event = this.eventRepository.create({
      ...createEventDto,
      created_by: user ? user.id : null,
    });
    return this.eventRepository.save(event);
  }

  async findByDeviceId(deviceId: string, query: EventQueryDto, user: User): Promise<WaterQualityEvent[]> {
    const device = await this.devicesService.findOne(deviceId, user);
    if (!device) {
      throw new UnauthorizedException('You are not authorized to view events for this device.');
    }
    const { event_type, start_date, end_date } = query;
    const where: any = { device_id: deviceId };

    if (event_type) {
      where.event_type = event_type;
    }

    if (start_date && end_date) {
      where.event_date = Between(start_date, end_date);
    }

    return this.eventRepository.find({
      where,
      order: { event_date: 'DESC' },
    });
  }
}
