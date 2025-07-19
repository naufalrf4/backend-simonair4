import { Injectable, ConsoleLogger, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  // You can add custom methods here for structured logging
  // For example, to integrate with a service like Sentry or Datadog
}
