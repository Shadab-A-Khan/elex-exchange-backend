import {
  Injectable, Logger, UnauthorizedException, ConflictException,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  LoginDto,
  LoginOtpDto,
  RegisterDto,
  ResetPasswordSendOtpDto,
  ResetPasswordVerifyDto,
  ChangeEmailSendOtpDto,
  ChangeEmailVerifyCurrentDto,
  ChangeEmailVerifyNewDto,
  ChangePhoneSendOtpDto,
  ChangePhoneVerifyCurrentDto,
  ChangePhoneVerifyNewDto,
  VerifyEmailOtpDto,
} from './dto/auth.dto';

type OtpChannel = 'WHATSAPP' | 'EMAIL' | 'SMS';
type OtpPurpose = 'LOGIN' | 'REGISTRATION' | 'PASSWORD_RESET';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService,
    private configService: ConfigService,
    private mailService: MailService,
    private whatsappService: WhatsappService,
  ) {}

  // ─── OTP helpers (DB-backed) ───────────────────────────────────────

  private async createOtp(
    identifier: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
    userId?: string,
  ): Promise<string> {
    // Deactivate any previous active OTPs for this identifier + purpose
    await this.databaseService.query(
      `UPDATE otp_verifications
       SET is_active = FALSE
       WHERE identifier = $1 AND channel = $2 AND purpose = $3 AND is_active = TRUE`,
      [identifier, channel, purpose],
    );

    const otp = crypto.randomInt(100000, 1000000).toString();

    await this.databaseService.query(
      `INSERT INTO otp_verifications (user_id, identifier, channel, otp_code, purpose, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')`,
      [userId || null, identifier, channel, otp, purpose],
    );

    return otp;
  }

  private async checkOtp(
    identifier: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
    otp: string,
    consume: boolean,
  ): Promise<boolean> {
    // Find active, unexpired, unverified OTP
    const result = await this.databaseService.query(
      `SELECT id, otp_code, attempts, max_attempts
       FROM otp_verifications
       WHERE identifier = $1 AND channel = $2 AND purpose = $3
         AND is_active = TRUE AND verified_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [identifier, channel, purpose],
    );

    if (!result.rows.length) return false;

    const record = result.rows[0];

    // Check max attempts
    if (record.attempts >= record.max_attempts) {
      await this.databaseService.query(
        `UPDATE otp_verifications SET is_active = FALSE WHERE id = $1`,
        [record.id],
      );
      return false;
    }

    // Wrong OTP — increment attempts
    if (record.otp_code !== otp) {
      await this.databaseService.query(
        `UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`,
        [record.id],
      );
      return false;
    }

    // Correct OTP — consume if requested
    if (consume) {
      await this.databaseService.query(
        `UPDATE otp_verifications SET verified_at = NOW(), is_active = FALSE WHERE id = $1`,
        [record.id],
      );
    }

    return true;
  }

  // ─── Send OTP ──────────────────────────────────────────────────────

  async sendOtp(whatsappNo: string, purpose: 'LOGIN' | 'REGISTRATION' = 'REGISTRATION') {
    const otp = await this.createOtp(whatsappNo, 'WHATSAPP', purpose);

    await this.whatsappService.sendOtp(whatsappNo, otp);
    this.logger.log(`OTP sent to ${whatsappNo}`);

    return { message: 'OTP sent successfully', whatsappNo };
  }

  // ─── Verify OTP (without consuming — for registration pre-check) ──

  async verifyOtpOnly(whatsappNo: string, otp: string, purpose: 'LOGIN' | 'REGISTRATION' = 'REGISTRATION'): Promise<{ valid: boolean }> {
    const valid = await this.checkOtp(whatsappNo, 'WHATSAPP', purpose, otp, false);
    return { valid };
  }

  // ─── Register ──────────────────────────────────────────────────────
  //
  // Transaction-wrapped INSERT across three tables:
  //
  //   1. users                — auth shell (email, password_hash, names, phone)
  //   2. trader_profiles      — business identity (company_name, trader_code)
  //   3. company_gstins       — primary GSTIN, only if supplied
  //
  // Why a transaction: a half-registered trader (users without
  // trader_profiles) was the previous shipping bug. All three writes commit
  // together or roll back together.
  //
  // Why SET LOCAL app.current_user_role = 'SUPER_ADMIN':
  // RLS on trader_profiles + company_gstins requires either an admin role
  // or `user_id = current_user_id()`. During register `current_user_id()`
  // is NULL (no session set), so without elevation the second + third
  // INSERTs would be rejected. SET LOCAL scopes the elevation to this
  // transaction only — it auto-reverts on COMMIT or ROLLBACK.

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, whatsappNo, gstin } = registerDto;
    const companyName = registerDto.companyName.trim();

    const finalPassword = password || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    const traderCode = `TRD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const client = await this.databaseService.getClient();
    let userRow: { id: string; email: string; role: string };

    try {
      await client.query('BEGIN');
      // Bypass RLS for the registration sequence. Auto-reverts on COMMIT/ROLLBACK.
      await client.query(`SET LOCAL app.current_user_role = 'SUPER_ADMIN'`);

      // 1. users
      const usersRes = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, phone, phone_verified)
         VALUES ($1, $2, $3, $4, 'TRADER', $5, $6)
         RETURNING id, email, role`,
        [
          email,
          hashedPassword,
          firstName || null,
          lastName || null,
          whatsappNo || null,
          whatsappNo ? true : false,
        ],
      );
      userRow = usersRes.rows[0];

      // 2. trader_profiles
      const profileRes = await client.query(
        `INSERT INTO trader_profiles (user_id, trader_code, company_name, whatsapp_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userRow.id, traderCode, companyName, whatsappNo || null],
      );
      const traderProfileId: string = profileRes.rows[0].id;

      // 3. company_gstins (now required — DTO enforces non-empty + format).
      // Stored upper-case for consistency with the DB CHECK regex.
      await client.query(
        `INSERT INTO company_gstins (trader_profile_id, gstin, is_primary)
         VALUES ($1, $2, TRUE)`,
        [traderProfileId, gstin.trim().toUpperCase()],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      // Surface 23505 unique violation as ConflictException for clean 409s.
      // Includes: users.email, users.phone, trader_profiles.trader_code,
      // company_gstins.gstin.
      if (
        err && typeof err === 'object' && 'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        const detail = (err as { detail?: string }).detail ?? '';
        if (detail.includes('email')) throw new ConflictException('Email already registered');
        if (detail.includes('phone')) throw new ConflictException('Phone already registered');
        if (detail.includes('gstin')) throw new ConflictException('GSTIN already registered');
        throw new ConflictException('Account already exists');
      }
      throw err;
    } finally {
      client.release();
    }

    // Welcome email (non-blocking — registration succeeds even if mail fails)
    try {
      const loginUrl =
        this.configService.get<string>('CORS_ORIGIN')?.split(',').find((u: string) => u.includes('3003'))
        || 'http://localhost:3003';
      const traderName = firstName || email;

      if (!password) {
        // No password supplied by caller — backend auto-generated one.
        // Include it in the welcome email so the user has their credentials.
        // When the frontend provides a password it sends the credentials email
        // itself via /mail/send-welcome-credentials after auto sign-in.
        await this.mailService.sendWelcomeCredentialsEmail({
          to: email,
          traderName,
          businessName: companyName,
          email,
          password: finalPassword,
          loginUrl: `${loginUrl}/login`,
        });
      }
    } catch (emailError) {
      this.logger.warn('Welcome email failed (non-critical)', emailError);
    }

    return {
      message: 'User registered successfully',
      user: userRow,
    };
  }

  // ─── Login with OTP ────────────────────────────────────────────────

  async loginWithOtp(loginOtpDto: LoginOtpDto) {
    const { whatsappNo, otp } = loginOtpDto;

    // Login-otp can be called after either LOGIN or REGISTRATION send-otp
    const isValid =
      await this.checkOtp(whatsappNo, 'WHATSAPP', 'LOGIN', otp, true) ||
      await this.checkOtp(whatsappNo, 'WHATSAPP', 'REGISTRATION', otp, true);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // LEFT JOINs so a user without a trader_profile (e.g. legacy rows
    // from before the register fix) still authenticates — they just get
    // company_name / gstin = null. Same for users without a primary GSTIN.
    const result = await this.databaseService.query(
      `SELECT
         u.id, u.email, u.role, u.status, u.first_name, u.last_name, u.phone, u.email_verified,
         tp.company_name,
         cg.gstin
       FROM users u
       LEFT JOIN trader_profiles tp ON tp.user_id = u.id
       LEFT JOIN company_gstins cg ON cg.trader_profile_id = tp.id AND cg.is_primary = TRUE
       WHERE u.phone = $1`,
      [whatsappNo],
    );

    if (!result.rows.length) {
      throw new UnauthorizedException('No account found with this WhatsApp number');
    }

    const user = result.rows[0];

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    // Record last_login timestamp (non-critical — don't fail login if this errors)
    await this.databaseService
      .query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])
      .catch((err) => console.error('Failed to update last_login', err));

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        emailVerified: user.email_verified,
        companyName: user.company_name,
        gstin: user.gstin,
      },
    };
  }

  // ─── Login with email/password ─────────────────────────────────────

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const result = await this.databaseService.query(
      `SELECT
         u.id, u.email, u.password_hash, u.role, u.status, u.first_name, u.last_name, u.phone, u.email_verified,
         tp.company_name,
         cg.gstin
       FROM users u
       LEFT JOIN trader_profiles tp ON tp.user_id = u.id
       LEFT JOIN company_gstins cg ON cg.trader_profile_id = tp.id AND cg.is_primary = TRUE
       WHERE u.email = $1`,
      [email],
    );

    if (!result.rows.length) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    // Record last_login timestamp (non-critical — don't fail login if this errors)
    await this.databaseService
      .query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])
      .catch((err) => console.error('Failed to update last_login', err));

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        emailVerified: user.email_verified,
        companyName: user.company_name,
        gstin: user.gstin,
      },
    };
  }

  // ─── Reset password: send OTP ──────────────────────────────────────

  async resetPasswordSendOtp(dto: ResetPasswordSendOtpDto) {
    const { method, email, whatsappNo } = dto;

    if (method === 'email') {
      if (!email) throw new BadRequestException('Email is required');
      const result = await this.databaseService.query(
        'SELECT id, first_name FROM users WHERE email = $1',
        [email],
      );
      if (!result.rows.length) throw new UnauthorizedException('No account found with this email');

      const otp = await this.createOtp(email, 'EMAIL', 'PASSWORD_RESET', result.rows[0].id);

      // Send OTP via email
      try {
        await this.mailService.sendOtpEmail({
          to: email,
          name: result.rows[0].first_name || email,
          otp,
          expiresInMinutes: 5,
        });
      } catch (emailError) {
        this.logger.warn('OTP email failed (non-critical)', emailError);
      }

      return { message: 'OTP sent successfully', method, identifier: email };
    }

    if (!whatsappNo) throw new BadRequestException('WhatsApp number is required');
    const result = await this.databaseService.query(
      'SELECT id FROM users WHERE phone = $1',
      [whatsappNo],
    );
    if (!result.rows.length) throw new UnauthorizedException('No account found with this WhatsApp number');

    const otp = await this.createOtp(whatsappNo, 'WHATSAPP', 'PASSWORD_RESET', result.rows[0].id);

    await this.whatsappService.sendOtp(whatsappNo, otp);

    return { message: 'OTP sent successfully', method, identifier: whatsappNo };
  }

  // ─── Reset password: verify OTP + update password ──────────────────

  async resetPasswordVerify(dto: ResetPasswordVerifyDto) {
    const { method, email, whatsappNo, otp, newPassword } = dto;

    const identifier = method === 'email' ? email : whatsappNo;
    const channel: OtpChannel = method === 'email' ? 'EMAIL' : 'WHATSAPP';

    if (!identifier) throw new BadRequestException(`${method === 'email' ? 'Email' : 'WhatsApp number'} is required`);

    const isValid = await this.checkOtp(identifier, channel, 'PASSWORD_RESET', otp, true);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const column = method === 'email' ? 'email' : 'phone';

    const result = await this.databaseService.query(
      `UPDATE users SET password_hash = $1 WHERE ${column} = $2 RETURNING id`,
      [hashedPassword, identifier],
    );

    if (!result.rows.length) throw new BadRequestException('Failed to update password');

    return { message: 'Password updated successfully' };
  }

  // ─── Availability check ────────────────────────────────────────────

  async checkAvailability(email?: string, phone?: string, gstin?: string) {
    const result: {
      emailAvailable?: boolean;
      phoneAvailable?: boolean;
      gstinAvailable?: boolean;
    } = {};

    if (email) {
      const emailResult = await this.databaseService.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );
      result.emailAvailable = emailResult.rows.length === 0;
    }

    if (phone) {
      const phoneResult = await this.databaseService.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone],
      );
      result.phoneAvailable = phoneResult.rows.length === 0;
    }

    if (gstin) {
      // GSTIN lives on company_gstins, FK-linked to trader_profiles. Stored
      // upper-case server-side; uppercase the input so we don't miss
      // dupes from case-only differences.
      const gstinResult = await this.databaseService.query(
        'SELECT id FROM company_gstins WHERE gstin = $1',
        [gstin.toUpperCase()],
      );
      result.gstinAvailable = gstinResult.rows.length === 0;
    }

    return result;
  }

  // ─── Validate user (JWT strategy) ─────────────────────────────────

  async validateUser(userId: string): Promise<any> {
    const result = await this.databaseService.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [userId],
    );

    if (!result.rows.length) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }

  // ─── Email Change: Step 1 — Send OTP to current email ──────
  async changeEmailSendOtp(userId: string, dto: ChangeEmailSendOtpDto) {
    const result = await this.databaseService.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [userId],
    );
    if (!result.rows.length) throw new NotFoundException('User not found');
    const currentEmail = result.rows[0].email;
    const firstName = result.rows[0].first_name;

    // Check new email is not already taken
    const existing = await this.databaseService.query(
      'SELECT id FROM users WHERE email = $1',
      [dto.newEmail],
    );
    if (existing.rows.length) throw new ConflictException('This email is already registered');

    // Prefixed identifier avoids collision with real email OTPs; reuses existing DB purpose
    const otp = await this.createOtp(`email-change-current:${userId}`, 'EMAIL', 'REGISTRATION', userId);

    // Send OTP to current email
    try {
      await this.mailService.sendOtpEmail({
        to: currentEmail,
        name: firstName || currentEmail,
        otp,
        expiresInMinutes: 5,
      });
    } catch (emailError) {
      this.logger.warn('Email change OTP send failed', emailError);
    }

    return { message: 'OTP sent to your current email', currentEmail };
  }

  // ─── Email Change: Step 2 — Verify current email OTP, send OTP to new email
  async changeEmailVerifyCurrent(userId: string, dto: ChangeEmailVerifyCurrentDto) {
    const isValid = await this.checkOtp(`email-change-current:${userId}`, 'EMAIL', 'REGISTRATION', dto.otp, true);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    // Check new email is still available
    const existing = await this.databaseService.query(
      'SELECT id FROM users WHERE email = $1',
      [dto.newEmail],
    );
    if (existing.rows.length) throw new ConflictException('This email is already registered');

    // Send OTP to new email
    const otp = await this.createOtp(`email-change-new:${userId}`, 'EMAIL', 'REGISTRATION', userId);

    try {
      await this.mailService.sendOtpEmail({
        to: dto.newEmail,
        name: dto.newEmail,
        otp,
        expiresInMinutes: 5,
      });
    } catch (emailError) {
      this.logger.warn('New email OTP send failed', emailError);
    }

    return { message: 'Current email verified. OTP sent to your new email.' };
  }

  // ─── Email Change: Step 3 — Verify new email OTP, update email in DB ─
  async changeEmailVerifyNew(userId: string, dto: ChangeEmailVerifyNewDto) {
    const isValid = await this.checkOtp(`email-change-new:${userId}`, 'EMAIL', 'REGISTRATION', dto.otp, true);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    // Final check — email still available
    const existing = await this.databaseService.query(
      'SELECT id FROM users WHERE email = $1',
      [dto.newEmail],
    );
    if (existing.rows.length) throw new ConflictException('This email is already registered');

    // Update email in database
    const result = await this.databaseService.query(
      'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email',
      [dto.newEmail, userId],
    );
    if (!result.rows.length) throw new BadRequestException('Failed to update email');

    return { message: 'Email updated successfully', email: result.rows[0].email };
  }

  // ─── Phone Change: Step 1 — Send OTP to current phone ─────
  async changePhoneSendOtp(userId: string, _dto: ChangePhoneSendOtpDto) {
    const result = await this.databaseService.query(
      'SELECT phone FROM users WHERE id = $1',
      [userId],
    );
    if (!result.rows.length) throw new NotFoundException('User not found');
    const currentPhone = result.rows[0].phone;
    if (!currentPhone) throw new BadRequestException('No phone number on file');

    const otp = await this.createOtp(`phone-change-current:${userId}`, 'WHATSAPP', 'REGISTRATION', userId);

    await this.whatsappService.sendOtp(currentPhone, otp);
    this.logger.log(`Phone change OTP sent to current phone ${currentPhone}`);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[DEV] Phone change OTP for ${currentPhone}: ${otp}`);
    }

    return { message: 'OTP sent to your current phone number', currentPhone };
  }

  // ─── Phone Change: Step 2 — Verify current phone, send OTP to new phone
  async changePhoneVerifyCurrent(userId: string, dto: ChangePhoneVerifyCurrentDto) {
    const isValid = await this.checkOtp(`phone-change-current:${userId}`, 'WHATSAPP', 'REGISTRATION', dto.otp, true);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const existing = await this.databaseService.query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [dto.newPhone, userId],
    );
    if (existing.rows.length) throw new ConflictException('This phone number is already registered to another account');

    const otp = await this.createOtp(`phone-change-new:${userId}`, 'WHATSAPP', 'REGISTRATION', userId);

    await this.whatsappService.sendOtp(dto.newPhone, otp);
    this.logger.log(`Phone change OTP sent to new phone ${dto.newPhone}`);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[DEV] Phone change OTP for ${dto.newPhone}: ${otp}`);
    }

    return { message: 'Current phone verified. OTP sent to your new phone number.' };
  }

  // ─── Phone Change: Step 3 — Verify new phone OTP, update phone in DB
  async changePhoneVerifyNew(userId: string, dto: ChangePhoneVerifyNewDto) {
    const isValid = await this.checkOtp(`phone-change-new:${userId}`, 'WHATSAPP', 'REGISTRATION', dto.otp, true);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const existing = await this.databaseService.query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [dto.newPhone, userId],
    );
    if (existing.rows.length) throw new ConflictException('This phone number is already registered to another account');

    const result = await this.databaseService.query(
      'UPDATE users SET phone = $1, phone_verified = TRUE WHERE id = $2 RETURNING id, phone',
      [dto.newPhone, userId],
    );
    if (!result.rows.length) throw new BadRequestException('Failed to update phone');

    return { message: 'Phone number updated successfully', phone: result.rows[0].phone };
  }

  // ─── Email Verification: Send OTP to user's email ──────────
  async verifyEmailSendOtp(userId: string) {
    const result = await this.databaseService.query(
      'SELECT email, email_verified, first_name FROM users WHERE id = $1',
      [userId],
    );
    if (!result.rows.length) throw new NotFoundException('User not found');
    if (result.rows[0].email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    const email = result.rows[0].email;
    const firstName = result.rows[0].first_name;

    // Prefixed identifier avoids collision with real email OTPs
    const otp = await this.createOtp(`verify-email:${userId}`, 'EMAIL', 'REGISTRATION', userId);

    try {
      await this.mailService.sendOtpEmail({
        to: email,
        name: firstName || email,
        otp,
        expiresInMinutes: 5,
      });
    } catch (emailError) {
      this.logger.warn('Email verification OTP send failed', emailError);
    }

    // Dev-only: surface the OTP in the backend log so local testers can
    // complete the flow without a working SendGrid key. Mirrors the same
    // pattern in changePhoneSendOtp / changePhoneVerifyCurrent.
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(`[DEV] Email verification OTP for ${email}: ${otp}`);
    }

    return { message: 'Verification OTP sent to your email', email };
  }

  // ─── Email Verification: Verify OTP and mark email as verified ─
  async verifyEmailConfirm(userId: string, dto: VerifyEmailOtpDto) {
    const isValid = await this.checkOtp(`verify-email:${userId}`, 'EMAIL', 'REGISTRATION', dto.otp, true);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const result = await this.databaseService.query(
      'UPDATE users SET email_verified = true WHERE id = $1 RETURNING id, email, email_verified',
      [userId],
    );
    if (!result.rows.length) throw new NotFoundException('User not found');

    return { message: 'Email verified successfully', emailVerified: true };
  }
}
