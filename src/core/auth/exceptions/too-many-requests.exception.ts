import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(message?: string) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: message || 'Too many requests',
        error: 'Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
