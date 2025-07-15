import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from './config/env.validation';
import databaseConfig from './config/database.config';
import mqttConfig from './config/mqtt.config';
import { LoggerModule } from './logger/logger.module';

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
  ],
  exports: [ConfigModule, TypeOrmModule, LoggerModule],
})

export class CoreModule {}