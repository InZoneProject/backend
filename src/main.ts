import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('InZone API')
    .setDescription('API для системи контролю зон та RFID-зчитувачів')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📘 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
