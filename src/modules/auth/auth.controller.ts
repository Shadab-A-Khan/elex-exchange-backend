import { Controller, Post, Get, Patch, Body, UseGuards, Request, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CheckAvailabilityDto,
  LoginDto,
  LoginOtpDto,
  RegisterDto,
  UpdateProfileDto,
  ResetPasswordSendOtpDto,
  ResetPasswordVerifyDto,
  SendOtpDto,
  VerifyOtpDto,
  ChangeEmailSendOtpDto,
  ChangeEmailVerifyCurrentDto,
  ChangeEmailVerifyNewDto,
  ChangePhoneSendOtpDto,
  ChangePhoneVerifyCurrentDto,
  ChangePhoneVerifyNewDto,
  VerifyEmailOtpDto,
} from './dto/auth.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 3600 * 1000,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** 3 OTP sends per phone per minute */
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('send-otp')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.whatsappNo, sendOtpDto.purpose || 'REGISTRATION');
  }

  /** 5 verify attempts per minute */
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpOnly(dto.whatsappNo, dto.otp);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('check-availability')
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    return this.authService.checkAvailability(dto.email, dto.phone, dto.gstin);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    res.cookie('auth-token', result.access_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('login-otp')
  async loginWithOtp(
    @Body() loginOtpDto: LoginOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithOtp(loginOtpDto);
    res.cookie('auth-token', result.access_token, COOKIE_OPTIONS);
    return result;
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth-token', { path: '/' });
    return { message: 'Logged out' };
  }

  /** 3 reset-password OTP sends per minute */
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('reset-password/send-otp')
  async resetPasswordSendOtp(@Body() dto: ResetPasswordSendOtpDto) {
    return this.authService.resetPasswordSendOtp(dto);
  }

  @Post('reset-password/verify')
  async resetPasswordVerify(@Body() dto: ResetPasswordVerifyDto) {
    return this.authService.resetPasswordVerify(dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.authService.getFullProfile(req.user.userId);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('change-email/send-otp')
  async changeEmailSendOtp(@Request() req: any, @Body() dto: ChangeEmailSendOtpDto) {
    return this.authService.changeEmailSendOtp(req.user.userId, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('change-email/verify-current')
  async changeEmailVerifyCurrent(@Request() req: any, @Body() dto: ChangeEmailVerifyCurrentDto) {
    return this.authService.changeEmailVerifyCurrent(req.user.userId, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('change-email/verify-new')
  async changeEmailVerifyNew(@Request() req: any, @Body() dto: ChangeEmailVerifyNewDto) {
    return this.authService.changeEmailVerifyNew(req.user.userId, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('change-phone/send-otp')
  async changePhoneSendOtp(@Request() req: any, @Body() dto: ChangePhoneSendOtpDto) {
    return this.authService.changePhoneSendOtp(req.user.userId, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('change-phone/verify-current')
  async changePhoneVerifyCurrent(@Request() req: any, @Body() dto: ChangePhoneVerifyCurrentDto) {
    return this.authService.changePhoneVerifyCurrent(req.user.userId, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('change-phone/verify-new')
  async changePhoneVerifyNew(@Request() req: any, @Body() dto: ChangePhoneVerifyNewDto) {
    return this.authService.changePhoneVerifyNew(req.user.userId, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('verify-email/send-otp')
  async verifyEmailSendOtp(@Request() req: any) {
    return this.authService.verifyEmailSendOtp(req.user.userId);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('verify-email/verify')
  async verifyEmailConfirm(@Request() req: any, @Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailConfirm(req.user.userId, dto);
  }
}
