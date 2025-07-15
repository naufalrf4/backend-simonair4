import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { CreateFeedDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/auth/guards/roles-guard';
import { Roles } from 'src/core/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/core/auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Feed Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Register a new feed type for a device' })
  @ApiResponse({ status: 201, description: 'The feed has been successfully registered.' })
  create(@CurrentUser() user: User, @Body() createFeedDto: CreateFeedDto) {
    return this.feedService.create(user, createFeedDto);
  }

  @Get(':deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Get feed history for a device' })
  findAll(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.feedService.findAll(user, deviceId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }

  @Get('analytics/:deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Get feed analytics for a device' })
  getAnalytics(@CurrentUser() user: User, @Param('deviceId') deviceId: string) {
    return this.feedService.getAnalytics(user, deviceId);
  }

  @Get(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Get a specific feed record' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.feedService.findOne(user, id);
  }

  @Put(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Update a feed record' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() updateFeedDto: UpdateFeedDto) {
    return this.feedService.update(user, id, updateFeedDto);
  }

  @Put(':id/schedule')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Update the feeding schedule for a feed record' })
  updateSchedule(@CurrentUser() user: User, @Param('id') id: string, @Body() schedule: Record<string, any>) {
    return this.feedService.updateSchedule(user, id, schedule);
  }

  @Delete(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Delete a feed record' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.feedService.remove(user, id);
  }
}
