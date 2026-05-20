import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { MailModule } from './modules/mail/mail.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ListingsModule } from './modules/listings/listings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    DatabaseModule,
    AuthModule,
    MailModule,
    WhatsappModule,
    ListingsModule,
    DocumentsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
