import { createApp } from '../src/app.bootstrap';

let expressApp: any;

async function bootstrap() {
  if (!expressApp) {
    const result = await createApp();
    expressApp = result.expressApp;
  }
  return expressApp;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  app(req, res);
}
