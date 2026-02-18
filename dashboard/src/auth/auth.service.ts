import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, pass: string) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', '');
    const adminPassHash = this.configService.get<string>(
      'ADMIN_PASSWORD_HASH',
      '',
    );

    if (email !== adminEmail || !adminEmail) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(pass, adminPassHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: email, sub: 'admin-id' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
