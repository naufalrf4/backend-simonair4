import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import * as express from 'express';
import { AllExceptionsFilter } from './core/common/filters/http-exception.filter';
import { TransformInterceptor } from './core/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './core/common/interceptors/logging.interceptor';

import { AppModule } from './app/app.module';
import cookieParser from 'cookie-parser';

function setupSwagger(app: INestApplication) {
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SIMONAIR API')
      .setVersion('4.0')
      .setContact(
        'SIMONAIR Support',
        'https://github.com/naufalrf4/backend-simonair',
        'support@simonair.com'
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:8000', 'Development Server')
      .addServer('https://api.simonair.com', 'Production Server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token for authentication',
          in: 'header',
        },
        'JWT-auth'
      )
      .addCookieAuth('refresh_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
        description: 'Refresh token stored in httpOnly cookie'
      })
      .addTag('Authentication', 'User authentication and authorization endpoints')
      .addTag('Devices', 'Device registration and management')
      .addTag('Device Calibrations', 'Send calibration data to devices via MQTT')
      .addTag('Device Thresholds', 'Configure water quality thresholds for devices')
      .addTag('Sensors', 'Sensor data collection and monitoring')
      .addTag('Users', 'User management and profile operations')
      .addTag('Fish Growth', 'Fish development tracking and analytics')
      .addTag('Feed Management', 'Feeding schedules and analytics')
      .addTag('MQTT Health', 'MQTT broker connection monitoring')
      .addTag('Events', 'Water quality events and alerts')
      .addTag('Export', 'Data export and reporting')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => 
        `${controllerKey}_${methodKey}`,
    });

    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        displayRequestDuration: true,
      },
      customSiteTitle: 'SIMONAIR API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { background-color: #1976d2; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info .title { color: #1976d2; }
        .swagger-ui .btn.authorize { background-color: #1976d2; border-color: #1976d2; }
        .swagger-ui .btn.authorize:hover { background-color: #1565c0; border-color: #1565c0; }
      `,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `Swagger UI available at: http://localhost:${process.env.PORT ?? 3000}/api-docs`,
    );
  }
}
bootstrap();
