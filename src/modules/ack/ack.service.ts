import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';
import { ThresholdsService } from '../thresholds/thresholds.service';
import { AckGateway } from './ack.gateway';

@Injectable()
export class AckService {
  private readonly logger = new Logger(AckService.name);

  constructor(
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService: MqttService,
    @Inject(forwardRef(() => ThresholdsService))
    private readonly thresholdsService: ThresholdsService,
    private readonly ackGateway: AckGateway,
  ) {}

  async publishThresholdWithAck(deviceId: string, thresholdData: any): Promise<void> {
    const topic = `simonair/${deviceId}/offset`;
    const ackTopic = `${topic}/ack`;
    const payload = JSON.stringify(thresholdData);

    let timeoutId: NodeJS.Timeout;

    const ackCallback = async (topic: string, payload: Buffer) => {
      clearTimeout(timeoutId);
      this.mqttService.unsubscribe(ackTopic);
      const message = JSON.parse(payload.toString());
      const status = message.status === 'success' ? 'success' : 'failed';
      await this.thresholdsService.updateAckStatus(deviceId, status);
      this.ackGateway.broadcastThresholdAck(deviceId, status, `Thresholds updated ${status}`);
    };

    this.mqttService.subscribe(ackTopic, ackCallback);
    this.mqttService.publishWithRetry(topic, payload, { qos: 1 });

    timeoutId = setTimeout(async () => {
      this.mqttService.unsubscribe(ackTopic);
      await this.thresholdsService.updateAckStatus(deviceId, 'failed');
      this.ackGateway.broadcastThresholdAck(deviceId, 'failed', 'Timeout: No response from device');
    }, 30000); // 30-second timeout
  }
}