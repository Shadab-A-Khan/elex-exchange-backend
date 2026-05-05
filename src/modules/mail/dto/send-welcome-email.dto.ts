import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class SendWelcomeEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  traderName!: string;

  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  loginUrl!: string;
}
