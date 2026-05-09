import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly otpContentSid: string;

  constructor(private configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_FROM', '');
    this.otpContentSid = this.configService.get<string>('TWILIO_OTP_CONTENT_SID', '');
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      this.logger.error('Twilio credentials not configured');
      throw new Error('WhatsApp service not configured');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

    const params: Record<string, string> = {
      To: `whatsapp:${this.formatPhoneNumber(to)}`,
      From: `whatsapp:${this.fromNumber}`,
    };

    if (this.otpContentSid) {
      params.ContentSid = this.otpContentSid;
      params.ContentVariables = JSON.stringify({ '1': otp });
    } else {
      params.Body = `Your Elex Exchange verification code is: ${otp}. This code expires in 5 minutes.`;
    }

    const body = new URLSearchParams(params);

    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      // If ContentSid fails, retry with plain Body
      if (!response.ok && params.ContentSid) {
        const error = await response.json() as Record<string, string>;
        this.logger.warn(`ContentSid failed (${error.code}), falling back to Body`);
        const fallbackParams = new URLSearchParams({
          To: params.To,
          From: params.From,
          Body: `Your Elex Exchange verification code is: ${otp}. This code expires in 5 minutes.`,
        });
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: fallbackParams.toString(),
        });
      }

      if (!response.ok) {
        const error = await response.json() as Record<string, string>;
        this.logger.error(`Twilio API error: ${JSON.stringify(error)}`);
        throw new Error(`Failed to send WhatsApp message: ${error.message || response.statusText}`);
      }

      const data = await response.json() as { sid: string };
      this.logger.log(`WhatsApp OTP sent to ${to}, SID: ${data.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp OTP: ${error}`);
      throw error;
    }
  }

  async sendWelcomeCredentials(
    to: string,
    payload: {
      traderName: string;
      whatsappNo: string;
      email: string;
      password: string;
      loginUrl: string;
    },
  ): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      this.logger.error('Twilio credentials not configured');
      throw new Error('WhatsApp service not configured');
    }

    const body =
      `🎉 Welcome to Elex Exchange, ${payload.traderName}!\n\n` +
      `Your account is ready. Save these credentials:\n\n` +
      `📧 Email: ${payload.email}\n` +
      `📱 WhatsApp: ${payload.whatsappNo}\n` +
      `🔑 Password: ${payload.password}\n\n` +
      `Sign in at: ${payload.loginUrl}\n\n` +
      `You can also sign in anytime using WhatsApp OTP — just enter your number and we'll send a code.\n\n` +
      `Keep this message safe. We won't be able to show your password again.`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: `whatsapp:${this.formatPhoneNumber(to)}`,
      From: `whatsapp:${this.fromNumber}`,
      Body: body,
    });
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.json() as Record<string, string>;
        this.logger.error(`Twilio welcome credentials error: ${JSON.stringify(error)}`);
        throw new Error(`Failed to send WhatsApp message: ${error.message || response.statusText}`);
      }

      const data = await response.json() as { sid: string };
      this.logger.log(`Welcome credentials WhatsApp sent to ${to}, SID: ${data.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome credentials WhatsApp: ${error}`);
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `+${digits}`;
  }
}
