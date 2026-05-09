import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sgMail = require('@sendgrid/mail');
import {
  htmlOtpEmail,
  textOtpEmail,
  type OtpEmailContext,
} from './templates/otp';
import {
  htmlWelcomeEmail,
  textWelcomeEmail,
  type WelcomeEmailContext,
} from './templates/welcome';
import {
  htmlWelcomeCredentialsEmail,
  textWelcomeCredentialsEmail,
  type WelcomeCredentialsEmailContext,
} from './templates/welcome-credentials';
import {
  htmlListingApprovedEmail,
  textListingApprovedEmail,
  type ListingApprovedEmailContext,
} from './templates/listing-approved';
import {
  htmlAccountStatusEmail,
  textAccountStatusEmail,
  type AccountStatusEmailContext,
} from './templates/account-status';
import {
  htmlDocumentStatusEmail,
  textDocumentStatusEmail,
  type DocumentStatusEmailContext,
} from './templates/document-status';

export interface SendOtpEmailPayload {
  to: string;
  name: string;
  otp: string;
  expiresInMinutes?: number;
}

export interface SendWelcomeEmailPayload {
  to: string;
  traderName: string;
  businessName: string;
  loginUrl: string;
}

export interface SendWelcomeCredentialsEmailPayload {
  to: string;
  traderName: string;
  businessName: string;
  email: string;
  password: string;
  loginUrl: string;
}

export interface SendListingApprovedEmailPayload {
  to: string;
  traderName: string;
  productName: string;
  listingUrl: string;
}

export interface SendAccountStatusEmailPayload {
  to: string;
  name: string;
  companyName: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface SendDocumentStatusEmailPayload {
  to: string;
  name: string;
  documentType: string;
  status: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid API key configured');
    } else {
      this.logger.error('SENDGRID_API_KEY is not set — emails will not be sent');
    }
  }

  async sendOtpEmail(payload: SendOtpEmailPayload): Promise<void> {
    const ctx: OtpEmailContext = {
      name: payload.name,
      otp: payload.otp,
      expiresInMinutes: payload.expiresInMinutes ?? 5,
      year: new Date().getFullYear(),
    };

    await sgMail.send({
      from: this.configService.get<string>('SENDGRID_FROM') || '',
      to: payload.to,
      subject: `Your Elex Exchange verification code: ${payload.otp}`,
      html: htmlOtpEmail(ctx),
      text: textOtpEmail(ctx),
    });

    this.logger.log(`OTP email sent to ${payload.to}`);
  }

  async sendWelcomeEmail(payload: SendWelcomeEmailPayload): Promise<void> {
    const ctx: WelcomeEmailContext = {
      traderName: payload.traderName,
      businessName: payload.businessName,
      loginUrl: payload.loginUrl,
      year: new Date().getFullYear(),
    };

    await sgMail.send({
      from: this.configService.get<string>('SENDGRID_FROM') || '',
      to: payload.to,
      subject: `Welcome to Elex Exchange, ${payload.traderName}!`,
      html: htmlWelcomeEmail(ctx),
      text: textWelcomeEmail(ctx),
    });

    this.logger.log(`Welcome email sent to ${payload.to}`);
  }

  async sendWelcomeCredentialsEmail(payload: SendWelcomeCredentialsEmailPayload): Promise<void> {
    const ctx: WelcomeCredentialsEmailContext = {
      traderName: payload.traderName,
      businessName: payload.businessName,
      email: payload.email,
      password: payload.password,
      loginUrl: payload.loginUrl,
      year: new Date().getFullYear(),
    };

    await sgMail.send({
      from: this.configService.get<string>('SENDGRID_FROM') || '',
      to: payload.to,
      subject: `Welcome to Elex Exchange, ${payload.traderName}!`,
      html: htmlWelcomeCredentialsEmail(ctx),
      text: textWelcomeCredentialsEmail(ctx),
    });

    this.logger.log(`Welcome credentials email sent to ${payload.to}`);
  }

  async sendListingApprovedEmail(
    payload: SendListingApprovedEmailPayload,
  ): Promise<void> {
    const ctx: ListingApprovedEmailContext = {
      traderName: payload.traderName,
      productName: payload.productName,
      listingUrl: payload.listingUrl,
      year: new Date().getFullYear(),
    };

    await sgMail.send({
      from: this.configService.get<string>('SENDGRID_FROM') || '',
      to: payload.to,
      subject: `Your listing "${payload.productName}" is now live on Elex Exchange`,
      html: htmlListingApprovedEmail(ctx),
      text: textListingApprovedEmail(ctx),
    });

    this.logger.log(`Listing approved email sent to ${payload.to}`);
  }

  async sendAccountStatusEmail(
    payload: SendAccountStatusEmailPayload,
  ): Promise<void> {
    const isActive = payload.status === 'ACTIVE';
    const dashboardUrl =
      this.configService.get<string>('CORS_ORIGIN')?.split(',').find((u: string) => u.includes('3003')) ||
      'http://localhost:3003';

    const ctx: AccountStatusEmailContext = {
      name: payload.name,
      companyName: payload.companyName,
      status: payload.status,
      dashboardUrl: `${dashboardUrl}/login`,
      year: new Date().getFullYear(),
    };

    await sgMail.send({
      from: this.configService.get<string>('SENDGRID_FROM') || '',
      to: payload.to,
      subject: isActive
        ? 'Your Elex Exchange trader account is now active'
        : 'Your Elex Exchange trader account has been suspended',
      html: htmlAccountStatusEmail(ctx),
      text: textAccountStatusEmail(ctx),
    });

    this.logger.log(`Account status email sent to ${payload.to}`);
  }

  async sendDocumentStatusEmail(
    payload: SendDocumentStatusEmailPayload,
  ): Promise<void> {
    const ctx: DocumentStatusEmailContext = {
      name: payload.name,
      documentType: payload.documentType,
      status: payload.status,
      rejectionReason: payload.rejectionReason,
      year: new Date().getFullYear(),
    };

    await sgMail.send({
      from: this.configService.get<string>('SENDGRID_FROM') || '',
      to: payload.to,
      subject: payload.status === 'VERIFIED'
        ? `Document verified — ${payload.documentType}`
        : `Document update — ${payload.documentType}`,
      html: htmlDocumentStatusEmail(ctx),
      text: textDocumentStatusEmail(ctx),
    });

    this.logger.log(`Document status email sent to ${payload.to}`);
  }
}
