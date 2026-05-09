import { plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Testing = 'testing',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3001;

  // Database
  @IsString()
  ELEX_CONNECTION_STRING: string = '';

  // JWT — single secret for both traders and admins (role differentiates).
  @IsString()
  ELEX_JWT_SECRET: string = 'change_this_to_a_long_random_string';

  @IsNumber()
  ELEX_JWT_EXPIRATION: number = 3600;

  // CORS
  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000,http://localhost:3002';

  // Logging
  @IsString()
  LOG_LEVEL: string = 'info';

  // Twilio (WhatsApp OTP)
  @IsString()
  TWILIO_ACCOUNT_SID: string = '';

  @IsString()
  TWILIO_AUTH_TOKEN: string = '';

  @IsString()
  TWILIO_WHATSAPP_FROM: string = '';

  @IsString()
  TWILIO_OTP_CONTENT_SID: string = '';

  // SendGrid (email)
  @IsString()
  SENDGRID_API_KEY: string = '';

  @IsString()
  SENDGRID_FROM: string = '';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    validatedConfig.ELEX_JWT_SECRET === 'change_this_to_a_long_random_string'
  ) {
    throw new Error('ELEX_JWT_SECRET must be set to a real secret in production');
  }

  return validatedConfig;
}
