import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TooManyRequestsException } from './exceptions/too-many-requests.exception';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { UsersService } from '@/modules/users/users.service';
import { EmailService } from './services/email.service';
import { User, UserRole } from '@/modules/users/entities/user.entity';
import { CookieService } from './utils/cookie.service';
import { LoginAttempt } from './entities/login-attempt.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  LoginRequestDto,
  RegisterRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  ValidateResetTokenRequestDto,
  GoogleAuthRequestDto,
} from './dto/auth-request.dto';
import {
  UserResponseData,
  AuthResponseData,
  TokenResponseData,
  MessageResponseData,
  GoogleAuthUrlData,
  ResetTokenStatusData,
} from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_ATTEMPT_WINDOW = 3600000; // 1 hour in milliseconds
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly RESET_TOKEN_EXPIRY = 3600000; // 1 hour

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly cookieService: CookieService,
    private readonly configService: ConfigService,
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Transform User entity to UserResponseData
   */
  private transformUserResponse(user: User): UserResponseData {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      emailVerified: user.email_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: User,
    req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshTokenValue = uuidv4();
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(refreshTokenValue)
      .digest('hex');

    // Save refresh token to database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: hashedRefreshToken,
      user_id: user.id,
      ip_address:
        req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken: refreshTokenValue };
  }

  /**
   * Check if IP/email is rate limited for login attempts
   */
  private async checkLoginRateLimit(
    email: string,
    ipAddress: string,
  ): Promise<void> {
    const recentAttempts = await this.loginAttemptRepository.count({
      where: [
        {
          email,
          success: false,
          created_at: MoreThan(
            new Date(Date.now() - this.LOGIN_ATTEMPT_WINDOW),
          ),
        },
        {
          ip_address: ipAddress,
          success: false,
          created_at: MoreThan(
            new Date(Date.now() - this.LOGIN_ATTEMPT_WINDOW),
          ),
        },
      ],
    });

    if (recentAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new TooManyRequestsException(
        'Too many failed login attempts. Please try again later.',
      );
    }
  }

  /**
   * Record login attempt
   */
  private async recordLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
  ): Promise<void> {
    const attempt = this.loginAttemptRepository.create({
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
    });

    await this.loginAttemptRepository.save(attempt);
  }

  /**
   * User login
   */
  async login(
    loginDto: LoginRequestDto,
    req: Request,
    res: Response,
  ): Promise<AuthResponseData> {
    const ipAddress =
      req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check rate limit
    await this.checkLoginRateLimit(loginDto.email, ipAddress);

    // Validate user credentials
    const user = await this.usersService.findByEmail(loginDto.email, true);

    if (
      !user ||
      !(await this.usersService.validatePassword(user, loginDto.password))
    ) {
      // Record failed attempt
      await this.recordLoginAttempt(
        loginDto.email,
        ipAddress,
        userAgent,
        false,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      await this.recordLoginAttempt(
        loginDto.email,
        ipAddress,
        userAgent,
        false,
      );
      throw new UnauthorizedException('Account is deactivated');
    }

    // Record successful attempt
    await this.recordLoginAttempt(loginDto.email, ipAddress, userAgent, true);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user, req);

    // Set refresh token in httpOnly cookie
    this.cookieService.setRefreshToken(res, refreshToken);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Get fresh user data
    const updatedUser = await this.usersService.findOne(user.id);

    return {
      accessToken,
      user: this.transformUserResponse(updatedUser),
    };
  }

  /**
   * User registration
   */
  async register(
    registerDto: RegisterRequestDto,
    req: Request,
    res: Response,
  ): Promise<AuthResponseData> {
    const ipAddress =
      req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Check registration rate limit by IP
    const recentRegistrations = await this.loginAttemptRepository.count({
      where: {
        ip_address: ipAddress,
        created_at: MoreThan(new Date(Date.now() - this.LOGIN_ATTEMPT_WINDOW)),
      },
    });

    if (recentRegistrations >= 3) {
      throw new TooManyRequestsException(
        'Too many registration attempts from this IP. Please try again later.',
      );
    }

    // Create user
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      full_name: registerDto.fullName,
      role: UserRole.USER,
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user, req);

    // Set refresh token in httpOnly cookie
    this.cookieService.setRefreshToken(res, refreshToken);

    // Get user with relations
    const userWithDetails = await this.usersService.findOne(user.id);

    return {
      accessToken,
      user: this.transformUserResponse(userWithDetails),
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshTokenValue: string,
    req: Request,
    res: Response,
  ): Promise<TokenResponseData> {
    if (!refreshTokenValue) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Hash the token to compare with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshTokenValue)
      .digest('hex');

    // Find refresh token in database
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token: hashedToken,
        is_valid: true,
        expires_at: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if user is still active
    if (!refreshToken.user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Invalidate old refresh token
    refreshToken.is_valid = false;
    refreshToken.revoked_at = new Date();
    refreshToken.revoked_reason = 'Token refreshed';
    await this.refreshTokenRepository.save(refreshToken);

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(refreshToken.user, req);

    // Set new refresh token in cookie
    this.cookieService.setRefreshToken(res, newRefreshToken);

    return { accessToken };
  }

  /**
   * User logout
   */
  async logout(
    refreshTokenValue: string,
    res: Response,
  ): Promise<MessageResponseData> {
    if (refreshTokenValue) {
      // Hash the token
      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshTokenValue)
        .digest('hex');

      // Invalidate refresh token in database
      await this.refreshTokenRepository.update(
        { token: hashedToken },
        {
          is_valid: false,
          revoked_at: new Date(),
          revoked_reason: 'User logout',
        },
      );
    }

    // Clear refresh token cookie
    this.cookieService.clearRefreshToken(res);

    return { message: 'Logged out successfully' };
  }

  /**
   * Get Google OAuth URL
   */
  getGoogleLoginUrl(googleAuthDto?: GoogleAuthRequestDto): GoogleAuthUrlData {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

    // Generate PKCE challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    const options = {
      redirect_uri:
        googleAuthDto?.redirectUri ||
        this.configService.get<string>('GOOGLE_REDIRECT_URI', ''),
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID', ''),
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    };

    // Store code verifier and state in cache/session for later verification
    // This should be implemented based on your caching strategy

    const qs = new URLSearchParams(options);
    return { url: `${rootUrl}?${qs.toString()}` };
  }

  /**
   * Login with Google
   */
  async loginWithGoogle(
    googleUser: any,
    req: Request,
    res: Response,
  ): Promise<AuthResponseData> {
    let user = await this.usersService.findBySocialId(
      'google',
      googleUser.social_id,
    );

    if (!user) {
      // Check if email already exists
      const existingUser = await this.usersService.findByEmail(
        googleUser.email,
      );
      if (existingUser) {
        throw new ConflictException(
          'An account with this email already exists. Please log in with your original method.',
        );
      }

      // Create new user
      user = await this.usersService.create({
        email: googleUser.email,
        full_name: googleUser.full_name,
        social_provider: 'google',
        social_id: googleUser.social_id,
        email_verified: true,
        role: UserRole.USER,
      });
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user, req);

    // Set refresh token in httpOnly cookie
    this.cookieService.setRefreshToken(res, refreshToken);

    // Get user with relations
    const userWithDetails = await this.usersService.findOne(user.id);

    return {
      accessToken,
      user: this.transformUserResponse(userWithDetails),
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserResponseData> {
    const user = await this.usersService.findOne(userId);
    return this.transformUserResponse(user);
  }

  /**
   * Request password reset
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordRequestDto,
    req: Request,
  ): Promise<MessageResponseData> {
    const ipAddress =
      req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

    // Rate limit check
    const recentRequests = await this.loginAttemptRepository.count({
      where: {
        ip_address: ipAddress,
        created_at: MoreThan(new Date(Date.now() - this.LOGIN_ATTEMPT_WINDOW)),
      },
    });

    if (recentRequests >= 3) {
      throw new TooManyRequestsException(
        'Too many password reset requests. Please try again later.',
      );
    }

    try {
      const resetToken = await this.usersService.generateResetToken(
        forgotPasswordDto.email,
      );

      // Send email with reset link
      const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
      await this.emailService.sendPasswordResetEmail(
        forgotPasswordDto.email,
        resetLink,
      );

      // Record the request
      await this.recordLoginAttempt(
        forgotPasswordDto.email,
        ipAddress,
        req.headers['user-agent'] || 'unknown',
        true,
      );
    } catch (error) {
      // Don't reveal if email exists or not
    }

    // Always return success message for security
    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  /**
   * Validate reset token
   */
  async validateResetToken(
    validateDto: ValidateResetTokenRequestDto,
  ): Promise<ResetTokenStatusData> {
    const user = await this.usersService.findByResetToken(validateDto.token);

    if (
      !user ||
      !user.reset_token_expires ||
      user.reset_token_expires < new Date()
    ) {
      return {
        valid: false,
        message: 'Invalid or expired token',
      };
    }

    return {
      valid: true,
      message: 'Token is valid',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordRequestDto,
  ): Promise<MessageResponseData> {
    if (resetPasswordDto.password !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      // Get user email before resetting password
      const user = await this.usersService.findByResetToken(
        resetPasswordDto.token,
      );

      await this.usersService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.password,
      );

      // Send confirmation email
      if (user) {
        await this.emailService.sendPasswordChangedEmail(user.email);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired reset token');
    }

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Cleanup expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    // Delete expired refresh tokens
    await this.refreshTokenRepository.delete({
      expires_at: MoreThan(new Date()),
    });

    // Delete old login attempts
    await this.loginAttemptRepository.delete({
      created_at: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24 hours
    });
  }
}
