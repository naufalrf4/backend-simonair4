import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from './config/env.validation';
import databaseConfig from './config/database.config';
import mqttConfig from './config/mqtt.config';
import { LoggerModule } from './logger/logger.module';
import { CommonModule } from './common/common.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
      load: [databaseConfig, mqttConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        return {
          ...dbConfig,
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
    LoggerModule,
    CommonModule,
  ],
  exports: [ConfigModule, TypeOrmModule, LoggerModule, CommonModule],
})
export class CoreModule {}
