import { IsString, IsNotEmpty, Matches } from 'class-validator';

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export class SendWelcomeCredentialsWhatsappDto {
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_REGEX, { message: 'whatsappNo must be 7–15 digits, optionally prefixed with +' })
  whatsappNo!: string;

  @IsString()
  @IsNotEmpty()
  traderName!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  loginUrl!: string;
}
