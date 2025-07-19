import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import {
  LoginRequestDto,
  RegisterRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  ValidateResetTokenRequestDto,
  GoogleAuthRequestDto,
  GoogleCallbackRequestDto,
} from './dto/auth-request.dto';
import {
  AuthResponseData,
  TokenResponseData,
  MessageResponseData,
  UserResponseData,
  GoogleAuthUrlData,
  ResetTokenStatusData,
} from './dto/auth-response.dto';
import { AuthErrorResponseDto } from './dto/error-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Login',
    description:
      'Authenticate user with email and password. Returns access token and user data.',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseData,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account deactivated',
    type: AuthErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many failed login attempts',
    type: AuthErrorResponseDto,
  })
  async login(
    @Body() loginDto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseData> {
    return this.authService.login(loginDto, req, res);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User Registration',
    description:
      'Create a new user account. Returns access token and user data.',
  })
  @ApiBody({ type: RegisterRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: AuthResponseData,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    type: AuthErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many registration attempts',
    type: AuthErrorResponseDto,
  })
  async register(
    @Body() registerDto: RegisterRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseData> {
    return this.authService.register(registerDto, req, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'Refresh Access Token',
    description:
      'Generate a new access token using the refresh token from httpOnly cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenResponseData,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    type: AuthErrorResponseDto,
  })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseData> {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.refreshToken(refreshToken, req, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'User Logout',
    description: 'Invalidate refresh token and clear cookies',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: MessageResponseData,
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseData> {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.logout(refreshToken, res);
  }

  @Get('google')
  @ApiOperation({
    summary: 'Get Google OAuth URL',
    description: 'Generate Google OAuth2 login URL with PKCE',
  })
  @ApiQuery({
    name: 'redirectUri',
    required: false,
    description: 'Custom redirect URI after authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'Google OAuth URL generated',
    type: GoogleAuthUrlData,
  })
  googleAuth(@Query() query: GoogleAuthRequestDto): GoogleAuthUrlData {
    return this.authService.getGoogleLoginUrl(query);
  }

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth Callback',
    description: 'Handle Google OAuth2 callback and authenticate user',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Authorization code from Google',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'State parameter for CSRF protection',
  })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful',
    type: AuthResponseData,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists with different provider',
    type: AuthErrorResponseDto,
  })
  async googleCallback(
    @Query() query: GoogleCallbackRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseData> {
    // This would typically use the Google strategy from Passport
    // For now, we'll need to implement the Google OAuth flow manually
    // or continue using the existing Passport strategy
    throw new Error('Google OAuth callback not implemented');
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get User Profile',
    description: 'Get authenticated user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    type: UserResponseData,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: AuthErrorResponseDto,
  })
  async getProfile(@CurrentUser() user: User): Promise<UserResponseData> {
    return this.authService.getProfile(user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request Password Reset',
    description: 'Send password reset link to user email',
  })
  @ApiBody({ type: ForgotPasswordRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Reset link sent if email exists',
    type: MessageResponseData,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many reset requests',
    type: AuthErrorResponseDto,
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordRequestDto,
    @Req() req: Request,
  ): Promise<MessageResponseData> {
    return this.authService.forgotPassword(forgotPasswordDto, req);
  }

  @Get('reset-password/validate/:token')
  @ApiOperation({
    summary: 'Validate Reset Token',
    description: 'Check if password reset token is valid',
  })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    type: ResetTokenStatusData,
  })
  async validateResetToken(
    @Param('token') token: string,
  ): Promise<ResetTokenStatusData> {
    return this.authService.validateResetToken({ token });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset Password',
    description: 'Reset user password using valid reset token',
  })
  @ApiBody({ type: ResetPasswordRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: MessageResponseData,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or passwords do not match',
    type: AuthErrorResponseDto,
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordRequestDto,
  ): Promise<MessageResponseData> {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
