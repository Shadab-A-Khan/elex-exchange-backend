import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class SendWelcomeCredentialsEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  traderName!: string;

  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  loginUrl!: string;
}
