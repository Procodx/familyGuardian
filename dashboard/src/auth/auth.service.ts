import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly collectionName = 'admins';

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private firebaseService: FirebaseService,
  ) {}

  async onModuleInit() {
    console.log('AuthService: Checking for admin account...');
    await this.ensureAdminExists();
  }

  private async ensureAdminExists() {
    const db = this.firebaseService.getFirestore();
    if (!db) return;

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassHash = this.configService.get<string>('ADMIN_PASSWORD_HASH');

    if (!adminEmail || !adminPassHash) {
      console.warn('ADMIN_EMAIL or ADMIN_PASSWORD_HASH missing in .env');
      return;
    }

    try {
      const adminRef = db.collection(this.collectionName).doc(adminEmail);
      const doc = await adminRef.get();

      if (!doc.exists) {
        console.log(`Seeding initial admin user: ${adminEmail}`);
        await adminRef.set({
          email: adminEmail,
          passwordHash: adminPassHash,
          role: 'admin',
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error seeding admin user:', error);
    }
  }

  async login(email: string, pass: string) {
    const db = this.firebaseService.getFirestore();
    if (!db) {
      // Fallback to .env if firebase is not initialized
      return this.loginWithEnv(email, pass);
    }

    const adminRef = db.collection(this.collectionName).doc(email);
    const doc = await adminRef.get();

    if (!doc.exists) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const adminData = doc.data();
    if (!adminData) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(pass, adminData.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: adminData.email, sub: email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private async loginWithEnv(email: string, pass: string) {
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
