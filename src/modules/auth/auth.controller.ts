import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CheckAvailabilityDto,
  LoginDto,
  LoginOtpDto,
  RegisterDto,
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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-otp')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.whatsappNo, sendOtpDto.purpose || 'REGISTRATION');
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpOnly(dto.whatsappNo, dto.otp);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('check-availability')
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    return this.authService.checkAvailability(dto.email, dto.phone);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login-otp')
  async loginWithOtp(@Body() loginOtpDto: LoginOtpDto) {
    return this.authService.loginWithOtp(loginOtpDto);
  }

  @Post('reset-password/send-otp')
  async resetPasswordSendOtp(@Body() dto: ResetPasswordSendOtpDto) {
    return this.authService.resetPasswordSendOtp(dto);
  }

  @Post('reset-password/verify')
  async resetPasswordVerify(@Body() dto: ResetPasswordVerifyDto) {
    return this.authService.resetPasswordVerify(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async getProfile(@Request() req: any) {
    return {
      user: req.user,
      message: 'Profile retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email/send-otp')
  async changeEmailSendOtp(@Request() req: any, @Body() dto: ChangeEmailSendOtpDto) {
    return this.authService.changeEmailSendOtp(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email/verify-current')
  async changeEmailVerifyCurrent(@Request() req: any, @Body() dto: ChangeEmailVerifyCurrentDto) {
    return this.authService.changeEmailVerifyCurrent(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email/verify-new')
  async changeEmailVerifyNew(@Request() req: any, @Body() dto: ChangeEmailVerifyNewDto) {
    return this.authService.changeEmailVerifyNew(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-phone/send-otp')
  async changePhoneSendOtp(@Request() req: any, @Body() dto: ChangePhoneSendOtpDto) {
    return this.authService.changePhoneSendOtp(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-phone/verify-current')
  async changePhoneVerifyCurrent(@Request() req: any, @Body() dto: ChangePhoneVerifyCurrentDto) {
    return this.authService.changePhoneVerifyCurrent(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-phone/verify-new')
  async changePhoneVerifyNew(@Request() req: any, @Body() dto: ChangePhoneVerifyNewDto) {
    return this.authService.changePhoneVerifyNew(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-email/send-otp')
  async verifyEmailSendOtp(@Request() req: any) {
    return this.authService.verifyEmailSendOtp(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-email/verify')
  async verifyEmailConfirm(@Request() req: any, @Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailConfirm(req.user.userId, dto);
  }
}
