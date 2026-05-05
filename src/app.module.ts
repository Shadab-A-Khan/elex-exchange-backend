import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { MailModule } from './modules/mail/mail.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    MailModule,
    WhatsappModule,
  ],
})
export class AppModule {}
