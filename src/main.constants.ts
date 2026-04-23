import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const SWAGGER_CONFIG = {
  TITLE: 'InZone API',
  DESCRIPTION: 'API для системи контролю зон та RFID-зчитувачів',
  VERSION: '1.0',
  API_PATH: 'api/docs',
  BEARER_AUTH_NAME: 'JWT-auth',
} as const;

export const CORS_CONFIG: CorsOptions = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
};
