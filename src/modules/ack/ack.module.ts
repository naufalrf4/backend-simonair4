import { Module, forwardRef } from '@nestjs/common';
import { AckService } from './ack.service';
import { AckGateway } from './ack.gateway';
import { MqttModule } from '../mqtt/mqtt.module';
import { ThresholdsModule } from '../thresholds/thresholds.module';

@Module({
  imports: [forwardRef(() => MqttModule), forwardRef(() => ThresholdsModule)],
  providers: [AckService, AckGateway],
  exports: [AckService],
})
export class AckModule {}
