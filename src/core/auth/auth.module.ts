import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '@/modules/users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RefreshJwtStrategy } from './strategies/jwt-refresh.strategy';
import { RolesGuard } from './guards/roles-guard';
import { CookieService } from './utils/cookie.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { LoginAttempt } from './entities/login-attempt.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailService } from './services/email.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([LoginAttempt, RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    RefreshJwtStrategy,
    RolesGuard,
    CookieService,
    WsJwtGuard,
    EmailService,
  ],
  controllers: [AuthController],
  exports: [AuthService, CookieService, WsJwtGuard, JwtModule],
})
export class AuthModule {}
