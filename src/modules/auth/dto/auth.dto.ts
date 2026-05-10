import { IsEmail, IsString, MinLength, IsOptional, IsIn, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-zÀ-ɏ\s'\-\.&(),]+$/, {
    message: 'companyName must contain only letters and common punctuation',
  })
  @MaxLength(200)
  companyName?: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  // Optional names — but if supplied, must look like a name (letters and
  // common punctuation only). Pure-numeric "names" rejected with 400.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[A-Za-zÀ-ɏ\s'\-\.]+$/, {
    message: 'firstName must contain letters only — no numbers or symbols',
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[A-Za-zÀ-ɏ\s'\-\.]+$/, {
    message: 'lastName must contain letters only — no numbers or symbols',
  })
  lastName?: string;

  // Required: written into trader_profiles.company_name which is NOT NULL.
  // Must contain at least one letter — rejects pure-numeric / pure-symbol
  // company names while still permitting "3M", "365 Solutions" etc.
  @IsString()
  @IsNotEmpty({ message: 'companyName is required' })
  @MaxLength(255)
  @Matches(/[A-Za-zÀ-ɏ]/, {
    message: 'companyName must contain at least one letter',
  })
  companyName!: string;

  // Phone is optional in this DTO (legacy callers), but when supplied must be
  // digits only — same constraint enforced in users.phone via the frontend
  // and the OTP send-otp pre-flight.
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'whatsappNo must be 7–15 digits, optionally prefixed with +',
  })
  whatsappNo?: string;

  // Required 15-character GSTIN. Format mirrors the DB CHECK constraint on
  // company_gstins.gstin so a valid value will round-trip without rejection.
  @IsString()
  @IsNotEmpty({ message: 'gstin is required' })
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Enter a valid 15-character GSTIN',
  })
  gstin!: string;

  // City of the trader's primary business location. State is derived
  // server-side from the GSTIN prefix so the client only needs to send city.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

// Phone format used wherever the API accepts a number — 7–15 digits with
// an optional leading +. Matches the frontend's `regex(/^\d+$/)` check on
// the local-part plus the country code we prepend before sending.
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const OTP_REGEX = /^[0-9]{6}$/;

export class SendOtpDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'whatsappNo must be 7–15 digits, optionally prefixed with +' })
  whatsappNo!: string;

  @IsOptional()
  @IsIn(['LOGIN', 'REGISTRATION'])
  purpose?: 'LOGIN' | 'REGISTRATION';
}

export class VerifyOtpDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'whatsappNo must be 7–15 digits, optionally prefixed with +' })
  whatsappNo!: string;

  @IsString()
  @Matches(OTP_REGEX, { message: 'otp must be a 6-digit code' })
  otp!: string;
}

export class LoginOtpDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'whatsappNo must be 7–15 digits, optionally prefixed with +' })
  whatsappNo!: string;

  @IsString()
  @Matches(OTP_REGEX, { message: 'otp must be a 6-digit code' })
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
  @Matches(PHONE_REGEX, { message: 'phone must be 7–15 digits, optionally prefixed with +' })
  phone?: string;

  // Format-validated even on the availability check so an obviously bad
  // GSTIN gets a 400 instead of an empty `{}` response.
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Enter a valid 15-character GSTIN',
  })
  gstin?: string;
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
  @Matches(PHONE_REGEX, { message: 'newPhone must be 7–15 digits, optionally prefixed with +' })
  newPhone!: string;
}

export class ChangePhoneVerifyCurrentDto {
  @IsString()
  otp!: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: 'newPhone must be 7–15 digits, optionally prefixed with +' })
  newPhone!: string;
}

export class ChangePhoneVerifyNewDto {
  @IsString()
  otp!: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: 'newPhone must be 7–15 digits, optionally prefixed with +' })
  newPhone!: string;
}
