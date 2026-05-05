import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

export async function createApp() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { rawBody: true },
  );
  const configService = app.get(ConfigService);

  // Security: helmet with CSP relaxed for the GraphiQL UI.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://cdn.jsdelivr.net',
            'https://unpkg.com',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://unpkg.com',
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://unpkg.com',
            'ws://localhost:*',
            'wss://localhost:*',
            'https://*.vercel.app',
          ],
          fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    }),
  );

  // CORS — allow configured origins, all *.vercel.app, and localhost.
  const corsOrigins = [
    ...(configService.get<string>('CORS_ORIGIN')?.split(',') || []),
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3005',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.vercel.app') || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.init();
  return { app, expressApp };
}
