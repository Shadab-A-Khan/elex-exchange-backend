import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import express from 'express';
import { ConfigService } from '@nestjs/config';
import { postgraphile } from 'postgraphile';
import ConnectionFilterPlugin from 'postgraphile-plugin-connection-filter';
import * as jwt from 'jsonwebtoken';
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

  // CORS — allow configured origins, all *.vercel.app, and any localhost port.
  const extraOrigins = (configService.get<string>('CORS_ORIGIN')?.split(',') || []).map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === 'https://elex-exchange-web-production.up.railway.app' ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:') ||
        extraOrigins.includes(origin)
      ) {
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

  // PostGraphile — auto-generates a GraphQL schema for the `public` Postgres
  // schema. The admin frontend (elex-exchange-admin) speaks classic
  // PostGraphile (allUsers, traderProfileByUserId, filter:{equalTo:…}) which
  // matches our `public` schema 1:1. Mounted on the underlying Express app so
  // it lives alongside the Nest REST controllers (auth, trader, listings…).
  //const connectionString = configService.get<string>('ELEX_CONNECTION_STRING');
  // if (!connectionString) {
  //   throw new Error('ELEX_CONNECTION_STRING is not set — required by PostGraphile');
  // }
  
const connectionString = configService.get<string>('ELEX_CONNECTION_STRING');

if (!connectionString) {
  throw new Error('ELEX_CONNECTION_STRING is not set — required by PostGraphile');
}

try {
  const parsedDbUrl = new URL(connectionString);
  console.log('[DB Diagnostic] PostGraphile hostname:', parsedDbUrl.hostname);
} catch {
  throw new Error('ELEX_CONNECTION_STRING is not a valid database URL');
}

  const isDev = configService.get<string>('NODE_ENV') !== 'production';
  expressApp.use(
    postgraphile(connectionString, 'public', {
      graphqlRoute: '/graphql',
      graphiqlRoute: '/graphiql',
      graphiql: isDev,
      enhanceGraphiql: isDev,
      watchPg: isDev,
      dynamicJson: true,
      setofFunctionsContainNulls: false,
      ignoreRBAC: false,
      legacyRelations: 'omit',
      enableQueryBatching: true,
      pgSettings: async (req: any) => {
        const auth = (req.headers?.authorization ?? '') as string;
        if (!auth.startsWith('Bearer ')) return {};
        const token = auth.slice(7);
        try {
          const secret = configService.get<string>('ELEX_JWT_SECRET')!;
          const payload = jwt.verify(token, secret) as unknown as {
            sub: string;
            role: string;
          };
          return {
            'app.current_user_id':   payload.sub,
            'app.current_user_role': payload.role,
          };
        } catch {
          return {};
        }
      },
      disableDefaultMutations: false,
      appendPlugins: [ConnectionFilterPlugin],
      graphileBuildOptions: {
        connectionFilterRelations: true,
      },
      // Surface DB errors verbatim in dev for easier debugging; trim in prod.
      extendedErrors: isDev
        ? ['hint', 'detail', 'errcode']
        : ['errcode'],
      showErrorStack: isDev ? 'json' : false,
    }),
  );

  await app.init();
  return { app, expressApp };
}
