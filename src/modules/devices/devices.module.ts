import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { AuthModule } from '../../core/auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DevicesRepository } from './devices.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Device]), AuthModule, UsersModule],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository],
  exports: [DevicesService],
})
export class DevicesModule {}
