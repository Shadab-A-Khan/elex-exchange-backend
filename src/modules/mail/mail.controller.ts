import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MailService } from './mail.service';
import { SendOtpEmailDto } from './dto/send-otp-email.dto';
import { SendWelcomeEmailDto } from './dto/send-welcome-email.dto';
import { SendWelcomeCredentialsEmailDto } from './dto/send-welcome-credentials-email.dto';
import { SendListingApprovedEmailDto } from './dto/send-listing-approved-email.dto';
import { SendAccountStatusEmailDto } from './dto/send-account-status-email.dto';
import { SendDocumentStatusEmailDto } from './dto/send-document-status-email.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-otp')
  @UseGuards(JwtAuthGuard)
  async sendOtpEmail(@Body() dto: SendOtpEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendOtpEmail(dto);
    return { success: true };
  }

  @Post('send-welcome')
  @UseGuards(JwtAuthGuard)
  async sendWelcomeEmail(@Body() dto: SendWelcomeEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendWelcomeEmail(dto);
    return { success: true };
  }

  @Post('send-welcome-credentials')
  @UseGuards(JwtAuthGuard)
  async sendWelcomeCredentialsEmail(@Body() dto: SendWelcomeCredentialsEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendWelcomeCredentialsEmail(dto);
    return { success: true };
  }

  @Post('send-listing-approved')
  @UseGuards(JwtAuthGuard)
  async sendListingApprovedEmail(@Body() dto: SendListingApprovedEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendListingApprovedEmail(dto);
    return { success: true };
  }

  @Post('send-account-status')
  @UseGuards(JwtAuthGuard)
  async sendAccountStatusEmail(@Body() dto: SendAccountStatusEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendAccountStatusEmail(dto);
    return { success: true };
  }

  @Post('send-document-status')
  @UseGuards(JwtAuthGuard)
  async sendDocumentStatusEmail(@Body() dto: SendDocumentStatusEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendDocumentStatusEmail(dto);
    return { success: true };
  }
}
