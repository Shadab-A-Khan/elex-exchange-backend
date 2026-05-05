import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  whatsappNo?: string;
}

export class SendOtpDto {
  @IsString()
  whatsappNo!: string;

  @IsOptional()
  @IsIn(['LOGIN', 'REGISTRATION'])
  purpose?: 'LOGIN' | 'REGISTRATION';
}

export class VerifyOtpDto {
  @IsString()
  whatsappNo!: string;

  @IsString()
  otp!: string;
}

export class LoginOtpDto {
  @IsString()
  whatsappNo!: string;

  @IsString()
  otp!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class ResetPasswordSendOtpDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  whatsappNo?: string;

  @IsIn(['email', 'whatsapp'])
  method!: 'email' | 'whatsapp';
}

export class ResetPasswordVerifyDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  whatsappNo?: string;

  @IsIn(['email', 'whatsapp'])
  method!: 'email' | 'whatsapp';

  @IsString()
  otp!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class CheckAvailabilityDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class JwtPayload {
  sub!: string;
  email!: string;
  role!: string;
}

export class ChangeEmailSendOtpDto {
  @IsEmail()
  newEmail!: string;
}

export class ChangeEmailVerifyCurrentDto {
  @IsString()
  otp!: string;

  @IsEmail()
  newEmail!: string;
}

export class ChangeEmailVerifyNewDto {
  @IsString()
  otp!: string;

  @IsEmail()
  newEmail!: string;
}

export class VerifyEmailOtpDto {
  @IsString()
  otp!: string;
}

export class ChangePhoneSendOtpDto {
  @IsString()
  newPhone!: string;
}

export class ChangePhoneVerifyCurrentDto {
  @IsString()
  otp!: string;

  @IsString()
  newPhone!: string;
}

export class ChangePhoneVerifyNewDto {
  @IsString()
  otp!: string;

  @IsString()
  newPhone!: string;
}
