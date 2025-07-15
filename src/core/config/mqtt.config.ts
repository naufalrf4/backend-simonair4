import { registerAs } from '@nestjs/config';

export default registerAs('mqtt', () => ({
  brokerUrl: process.env.MQTT_BROKER_URL,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'simonair/',
  clientId: process.env.MQTT_CLIENT_ID || 'simonair-client',
}));
