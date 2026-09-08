import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4100),
  DATABASE_URL: Joi.string().required(),
  MONGODB_URL: Joi.string().required(),
  KEYCLOAK_ISSUER: Joi.string().uri().required(),
  OLLAMA_URL: Joi.string().uri().required(),
  FRONTEND_ORIGIN: Joi.string().uri().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
}).required();
