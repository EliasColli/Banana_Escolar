import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: configService.get<string[]>('corsOrigins') ?? ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Banana Escolar API')
    .setDescription(
      'API REST de gestión de incidencias escolares. MySQL es la única fuente de verdad; web y Flutter consumen estos endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .addServer('/v1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API disponible en http://localhost:${port}/v1`);
  logger.log(`OpenAPI en http://localhost:${port}/docs`);
}

void bootstrap();
