import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Put,
  Query,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalibrationsService } from './calibrations.service';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { CalibrationResponseDto } from './dto/calibration-response.dto';
import { plainToClass } from 'class-transformer';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { RolesGuard } from '@/core/auth/guards/roles-guard';

@Controller('calibrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class CalibrationsController {
  constructor(private readonly calibrationsService: CalibrationsService) {}

  @Post(':deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @HttpCode(HttpStatus.ACCEPTED)
  async create(
    @Param('deviceId') deviceId: string,
    @Body() createCalibrationDto: CreateCalibrationDto,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.calibrationsService.create(
      deviceId,
      createCalibrationDto,
      user,
    );
    return { message: 'Calibration request sent and is being processed.' };
  }

  @Get(':deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  async findAll(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Query('sensor_type') sensorType?: string,
  ): Promise<CalibrationResponseDto[]> {
    const calibrations = await this.calibrationsService.findAll(
      deviceId,
      user,
      sensorType,
    );
    return calibrations.map((c) => plainToClass(CalibrationResponseDto, c));
  }

  @Delete(':deviceId/:sensorType')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(
    @Param('deviceId') deviceId: string,
    @Param('sensorType') sensorType: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.calibrationsService.clear(deviceId, sensorType, user);
  }

  @Get('status/:deviceId')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  async getStatus(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    return this.calibrationsService.getStatus(deviceId, user);
  }

  @Put(':id/apply')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER)
  async apply(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CalibrationResponseDto> {
    const calibration = await this.calibrationsService.apply(id, user);
    return plainToClass(CalibrationResponseDto, calibration);
  }
}
