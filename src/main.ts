import { ConfigService } from '@nestjs/config';
import { createApp } from './app.bootstrap';

async function bootstrap() {
  const { app } = await createApp();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`Elex Exchange backend running at: http://localhost:${port}`);
  console.log(`GraphQL endpoint: http://localhost:${port}/graphql`);
  console.log(`GraphiQL IDE: http://localhost:${port}/graphiql`);
  console.log(`Auth endpoints: http://localhost:${port}/auth`);
  console.log(`Started: ${new Date().toISOString()}`);
}

bootstrap();
