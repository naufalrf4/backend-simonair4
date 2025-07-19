import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from '@/modules/events/dto/create-event.dto';
import { EventQueryDto } from '@/modules/events/dto/event-query.dto';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.create(createEventDto, user);
  }

  @Get(':deviceId')
  findByDeviceId(
    @Param('deviceId') deviceId: string,
    @Query() query: EventQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.findByDeviceId(deviceId, query, user);
  }
}
