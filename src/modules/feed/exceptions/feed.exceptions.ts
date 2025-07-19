import { BadRequestException } from '@nestjs/common';

export class InsufficientFeedDataException extends BadRequestException {
  constructor(message: string = 'Insufficient feed data to generate analytics.') {
    super(message);
  }
}