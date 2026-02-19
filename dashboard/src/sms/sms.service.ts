import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SmsResponse {
  success: boolean;
  providerResponse?: any;
  error?: string;
  phoneNumber: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string | undefined;
  private readonly senderId: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SMS_API_KEY');
    this.baseUrl = this.configService.get<string>('SMS_BASE_URL');
    this.senderId = this.configService.get<string>('SMS_SENDER_ID');
  }

  async sendPanicAlert(
    phoneNumber: string,
    message: string,
  ): Promise<SmsResponse> {
    if (!this.apiKey || !this.baseUrl) {
      this.logger.error('SMS configuration missing');
      return {
        success: false,
        error: 'SMS configuration missing',
        phoneNumber,
      };
    }

    try {
      this.logger.log(`Sending SMS to ${phoneNumber}...`);

      const response = await axios.post(
        this.baseUrl,
        {
          apiKey: this.apiKey,
          sender: this.senderId,
          to: phoneNumber,
          message: message,
        },
        {
          timeout: 10000, // 10s timeout
        },
      );

      this.logger.log(`SMS sent to ${phoneNumber} successfully`);
      return {
        success: true,
        providerResponse: response.data,
        phoneNumber,
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      this.logger.error(
        `Failed to send SMS to ${phoneNumber}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
        phoneNumber,
      };
    }
  }
}
