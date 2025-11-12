import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_CONSTANTS } from '../constants/email.constants';
import Mailjet, { Client } from 'node-mailjet';

@Injectable()
export class EmailService {
  private readonly mailjet: Client;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('EMAIL_API_KEY');
    const apiSecret = this.configService.getOrThrow<string>('EMAIL_API_SECRET');

    this.mailjet = Mailjet.apiConnect(apiKey, apiSecret);
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.mailjet
      .post('send', { version: EMAIL_CONSTANTS.MAILJET_API_VERSION })
      .request({
        Messages: [
          {
            From: {
              Email: this.configService.get<string>('EMAIL_FROM'),
              Name: EMAIL_CONSTANTS.SENDER_NAME,
            },
            To: [
              {
                Email: email,
              },
            ],
            Subject: EMAIL_CONSTANTS.EMAIL_SUBJECT,
            TextPart: EMAIL_CONSTANTS.EMAIL_TEXT_TEMPLATE(code),
            HTMLPart: EMAIL_CONSTANTS.EMAIL_HTML_TEMPLATE(code),
          },
        ],
      });
  }
}
