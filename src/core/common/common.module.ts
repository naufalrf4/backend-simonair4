import { Module, Global } from '@nestjs/common';
import { ErrorLoggingService } from './services/error-logging.service';
import { ErrorResponseService } from './services/error-response.service';

@Global()
@Module({
  providers: [ErrorLoggingService, ErrorResponseService],
  exports: [ErrorLoggingService, ErrorResponseService],
})
export class CommonModule {}
