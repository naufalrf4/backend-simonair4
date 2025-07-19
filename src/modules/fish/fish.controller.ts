import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FishService } from './fish.service';
import { CreateFishGrowthDto } from './dto/create-fish-growth.dto';
import { UpdateFishGrowthDto } from './dto/update-fish-growth.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/auth/guards/roles-guard';
import { Roles } from 'src/core/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/core/auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Fish Growth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fish/growth')
export class FishController {
  constructor(private readonly fishService: FishService) {}

  @Post(':deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Record a new fish growth measurement' })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() createFishGrowthDto: CreateFishGrowthDto,
  ) {
    return this.fishService.create(user, deviceId, createFishGrowthDto);
  }

  @Get(':deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Get fish growth history for a device' })
  @ApiResponse({ status: 200, description: 'Returns the growth history.' })
  findAll(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.fishService.findAll(
      user,
      deviceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics/:deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Get fish growth analytics for a device' })
  @ApiResponse({ status: 200, description: 'Returns growth analytics.' })
  getAnalytics(@CurrentUser() user: User, @Param('deviceId') deviceId: string) {
    return this.fishService.getAnalytics(user, deviceId);
  }

  @Get(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Get a specific fish growth record' })
  @ApiResponse({ status: 200, description: 'Returns the growth record.' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.fishService.findOne(user, id);
  }

  @Put(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Update a fish growth record' })
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully updated.',
  })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateFishGrowthDto: UpdateFishGrowthDto,
  ) {
    return this.fishService.update(user, id, updateFishGrowthDto);
  }

  @Delete(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @ApiOperation({ summary: 'Delete a fish growth record' })
  @ApiResponse({
    status: 204,
    description: 'The record has been successfully deleted.',
  })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.fishService.remove(user, id);
  }
}
