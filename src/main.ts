import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { SWAGGER_CONFIG, CORS_CONFIG } from './main.constants';
import { FILE_VALIDATION_CONSTANTS } from './shared/constants/file-validation.constants';

async function bootstrap() {
  const application =
    await NestFactory.create<NestExpressApplication>(AppModule);
  const configurationService = application.get(ConfigService);

  const frontendUrl = configurationService.get<string>('FRONTEND_URL');

  application.enableCors({
    ...CORS_CONFIG,
    origin: frontendUrl,
  });

  application.useStaticAssets(
    join(process.cwd(), FILE_VALIDATION_CONSTANTS.UPLOADS_FOLDER_NAME),
    {
      prefix: FILE_VALIDATION_CONSTANTS.UPLOADS_URL_PREFIX,
    },
  );

  application.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerOptions = new DocumentBuilder()
    .setTitle(SWAGGER_CONFIG.TITLE)
    .setDescription(SWAGGER_CONFIG.DESCRIPTION)
    .setVersion(SWAGGER_CONFIG.VERSION)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      SWAGGER_CONFIG.BEARER_AUTH_NAME,
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(
    application,
    swaggerOptions,
  );
  SwaggerModule.setup(SWAGGER_CONFIG.API_PATH, application, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const serverPort = configurationService.get<number>('PORT') ?? 3000;
  await application.listen(serverPort);
}

void bootstrap();
