import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { patchNestJsSwagger } from 'nestjs-zod';
import type { Env } from './config/env.schema';

interface BootstrapOptions {
  /** Nest root module for this service. */
  module: Parameters<typeof NestFactory.create>[0];
  /** Port to listen on. Falls back to the PORT env var. */
  port?: number;
  /** Swagger UI title. */
  title: string;
  /** Swagger description. */
  description?: string;
}

/**
 * Shared HTTP bootstrap for every service. Each service (monolith, auth-svc,
 * users-svc) calls this with its own module + port, so they run side by side on
 * different ports with identical middleware, CORS, and Swagger setup.
 */
export async function bootstrapHttpService(opts: BootstrapOptions): Promise<void> {
  const app = await NestFactory.create(opts.module, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins, credentials: true });

  patchNestJsSwagger();
  const swaggerConfig = new DocumentBuilder()
    .setTitle(opts.title)
    .setDescription(opts.description ?? opts.title)
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    jsonDocumentUrl: 'docs-json',
  });

  const port = opts.port ?? config.get('PORT', { infer: true }) ?? 4000;
  await app.listen(port);
  logger.log(`${opts.title} listening on :${port}`, 'Bootstrap');
}
