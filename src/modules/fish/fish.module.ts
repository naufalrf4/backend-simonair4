import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishGrowth } from './entities/fish-growth.entity';
import { FishController } from './fish.controller';
import { FishService } from './fish.service';
import { FishGrowthRepository } from './fish-growth.repository';
import { DevicesModule } from '../devices/devices.module';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FishGrowth]), AuthModule, DevicesModule],
  controllers: [FishController],
  providers: [FishService, FishGrowthRepository],
  exports: [FishService],
})
export class FishModule {}
