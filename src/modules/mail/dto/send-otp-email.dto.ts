import { IsEmail, IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class SendOtpEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  otp!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInMinutes?: number;
}
