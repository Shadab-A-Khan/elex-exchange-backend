import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MailService } from './mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { SendOtpEmailDto } from './dto/send-otp-email.dto';
import { SendWelcomeEmailDto } from './dto/send-welcome-email.dto';
import { SendWelcomeCredentialsEmailDto } from './dto/send-welcome-credentials-email.dto';
import { SendWelcomeCredentialsWhatsappDto } from './dto/send-welcome-credentials-whatsapp.dto';
import { SendListingApprovedEmailDto } from './dto/send-listing-approved-email.dto';
import { SendAccountStatusEmailDto } from './dto/send-account-status-email.dto';
import { SendDocumentStatusEmailDto } from './dto/send-document-status-email.dto';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly whatsappService: WhatsappService,
  ) {}

  // Trader-accessible: send their own welcome credentials after registration
  @Post('send-otp')
  @Roles('TRADER', 'ADMIN', 'SUPER_ADMIN')
  async sendOtpEmail(@Body() dto: SendOtpEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendOtpEmail(dto);
    return { success: true };
  }

  @Post('send-welcome')
  @Roles('TRADER', 'ADMIN', 'SUPER_ADMIN')
  async sendWelcomeEmail(@Body() dto: SendWelcomeEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendWelcomeEmail(dto);
    return { success: true };
  }

  @Post('send-welcome-credentials')
  @Roles('TRADER', 'ADMIN', 'SUPER_ADMIN')
  async sendWelcomeCredentialsEmail(@Body() dto: SendWelcomeCredentialsEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendWelcomeCredentialsEmail(dto);
    return { success: true };
  }

  @Post('send-welcome-credentials-whatsapp')
  @Roles('TRADER', 'ADMIN', 'SUPER_ADMIN')
  async sendWelcomeCredentialsWhatsapp(
    @Body() dto: SendWelcomeCredentialsWhatsappDto,
  ): Promise<{ success: boolean }> {
    await this.whatsappService.sendWelcomeCredentials(dto.whatsappNo, {
      traderName: dto.traderName,
      whatsappNo: dto.whatsappNo,
      email: dto.email,
      password: dto.password,
      loginUrl: dto.loginUrl,
    });
    return { success: true };
  }

  // Admin-only: moderation and status notifications
  @Post('send-listing-approved')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async sendListingApprovedEmail(@Body() dto: SendListingApprovedEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendListingApprovedEmail(dto);
    return { success: true };
  }

  @Post('send-account-status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async sendAccountStatusEmail(@Body() dto: SendAccountStatusEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendAccountStatusEmail(dto);
    return { success: true };
  }

  @Post('send-document-status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async sendDocumentStatusEmail(@Body() dto: SendDocumentStatusEmailDto): Promise<{ success: boolean }> {
    await this.mailService.sendDocumentStatusEmail(dto);
    return { success: true };
  }
}
