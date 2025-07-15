# Authentication Module Documentation

## Overview

This authentication module provides a complete authentication system with the following features:

1. **User Login** - Email/password authentication with rate limiting
2. **User Registration** - New user signup with strong password requirements
3. **Refresh Token** - JWT refresh token mechanism with secure storage
4. **Logout** - Token invalidation and cookie clearing
5. **Google OAuth** - Social login integration with PKCE support
6. **Profile Access** - Protected user profile endpoint
7. **Password Reset** - Forgot password flow with email verification
8. **Email Verification** - Optional email verification for new users

## Architecture

### Entities

- **User** - Main user entity (in users module)
- **LoginAttempt** - Tracks login attempts for rate limiting
- **RefreshToken** - Stores refresh tokens with metadata

### Services

- **AuthService** - Core authentication logic
- **EmailService** - Email sending functionality (stub implementation)
- **CookieService** - Secure cookie management
- **UsersService** - User data management (in users module)

### Security Features

1. **Rate Limiting**
   - Max 5 failed login attempts per hour per IP/email
   - Max 3 registration attempts per hour per IP
   - Max 3 password reset requests per hour per IP

2. **Token Management**
   - Access tokens: 15 minutes expiry
   - Refresh tokens: 7 days expiry, stored in httpOnly cookies
   - Refresh tokens are invalidated on use (rotation)

3. **Password Requirements**
   - Minimum 8 characters
   - Must contain uppercase, lowercase, number, and special character
   - Passwords are hashed using bcrypt

4. **CSRF Protection**
   - State parameter in OAuth flows
   - PKCE for Google OAuth

## API Endpoints

### Public Endpoints

#### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "user",
      "emailVerified": true,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/login",
    "executionTime": 123
  }
}
```

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "StrongPassword123!",
  "fullName": "New User"
}
```

**Response:** Same structure as login response

#### POST /auth/refresh
Refresh access token using refresh token from cookie.

**Response:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/refresh",
    "executionTime": 123
  }
}
```

#### POST /auth/logout
Logout and invalidate tokens.

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Logged out successfully"
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/logout",
    "executionTime": 123
  }
}
```

#### GET /auth/google
Get Google OAuth URL.

**Query Parameters:**
- `redirectUri` (optional) - Custom redirect URI

**Response:**
```json
{
  "status": "success",
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/google",
    "executionTime": 123
  }
}
```

#### GET /auth/google/callback
Handle Google OAuth callback.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - CSRF protection state

#### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "If the email exists, a password reset link has been sent."
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/forgot-password",
    "executionTime": 123
  }
}
```

#### GET /auth/reset-password/validate/:token
Validate reset token.

**Response:**
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "message": "Token is valid"
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/reset-password/validate/...",
    "executionTime": 123
  }
}
```

#### POST /auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "123e4567-e89b-12d3-a456-426614174000",
  "password": "NewStrongPassword123!",
  "confirmPassword": "NewStrongPassword123!"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Password has been reset successfully"
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/reset-password",
    "executionTime": 123
  }
}
```

### Protected Endpoints

#### GET /auth/profile
Get authenticated user profile.

**Headers:**
- `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user",
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/profile",
    "executionTime": 123
  }
}
```

## Error Responses

All error responses follow this structure:

```json
{
  "status": "error",
  "error": {
    "statusCode": 401,
    "message": "Invalid credentials",
    "error": "Unauthorized"
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/login",
    "executionTime": 123
  }
}
```

Common error codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid credentials or token)
- 409: Conflict (email already exists)
- 429: Too Many Requests (rate limit exceeded)

## Environment Variables

Required environment variables:

```env
# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000

# Email Configuration (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

## Database Migrations

Run the following migration to create required tables:

```bash
npm run migration:run
```

This will create:
- `login_attempts` table for rate limiting
- `refresh_tokens` table for refresh token storage

## Frontend Integration

### Storing Tokens

1. **Access Token**: Store in memory or localStorage (less secure)
2. **Refresh Token**: Automatically stored as httpOnly cookie

### Making Authenticated Requests

```javascript
// Add access token to headers
const response = await fetch('/api/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Token Refresh Flow

```javascript
// When access token expires (401 response)
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include' // Include cookies
});

const { data } = await refreshResponse.json();
const newAccessToken = data.accessToken;
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Store refresh tokens** in httpOnly cookies only
3. **Implement token rotation** (already done)
4. **Monitor failed login attempts** via login_attempts table
5. **Use strong passwords** (enforced by validation)
6. **Enable email verification** for production
7. **Implement 2FA** for additional security (future enhancement)

## Extending the Module

### Adding Email Verification

1. Update registration to send verification email
2. Add endpoint to verify email token
3. Restrict login for unverified emails if needed

### Adding Two-Factor Authentication

1. Add TOTP secret to user entity
2. Create endpoints for enabling/disabling 2FA
3. Update login flow to check for 2FA

### Custom OAuth Providers

1. Create new Passport strategy
2. Add configuration for provider
3. Create callback endpoint
4. Update auth service to handle new provider

## Troubleshooting

### Common Issues

1. **"Invalid refresh token"**
   - Check if refresh token cookie is being sent
   - Verify cookie domain/path settings
   - Check if token hasn't expired

2. **"Too many requests"**
   - Wait for rate limit window to expire
   - Check login_attempts table for debugging

3. **Google OAuth not working**
   - Verify redirect URI matches Google Console
   - Check client ID and secret
   - Ensure callback URL is correct

## TODO

- [ ] Implement actual email sending in EmailService
- [ ] Add email verification flow
- [ ] Add two-factor authentication
- [ ] Add session management UI
- [ ] Add password strength meter
- [ ] Add account lockout after too many attempts
- [ ] Add audit logging for security events