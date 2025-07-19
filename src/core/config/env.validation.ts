import * as Joi from 'joi';

export const validate = (config: Record<string, unknown>) => {
  const schema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(3000),

    // Database
    DATABASE_HOST: Joi.string().required(),
    DATABASE_PORT: Joi.number().required(),
    DATABASE_USER: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_NAME: Joi.string().required(),

    // JWT
    JWT_ACCESS_SECRET: Joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

    // MQTT
    MQTT_BROKER_URL: Joi.string().required(),
    MQTT_USERNAME: Joi.string().required(),
    MQTT_PASSWORD: Joi.string().required(),
    MQTT_TOPIC_PREFIX: Joi.string().default('simonair/'),
    MQTT_CLIENT_ID: Joi.string().default('simonair-client'),

    // CORS
    ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

    // Google OAuth
    GOOGLE_CLIENT_ID: Joi.string().optional(),
    GOOGLE_CLIENT_SECRET: Joi.string().optional(),
    GOOGLE_REDIRECT_URI: Joi.string().optional(),
  });

  const { error, value } = schema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }

  return value;
};
