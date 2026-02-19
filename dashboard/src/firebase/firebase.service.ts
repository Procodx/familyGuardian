import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private db: admin.firestore.Firestore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const getEnv = (key: string) =>
      this.configService.get<string>(key)?.replace(/^['"]|['"]$/g, '');

    const projectId = getEnv('FIREBASE_PROJECT_ID');
    const clientEmail = getEnv('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    if (privateKey) {
      privateKey = privateKey.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    }

    if (projectId && clientEmail && privateKey) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log('Firebase Admin SDK initialized successfully');
      }
      this.db = admin.firestore();
    } else {
      console.warn(
        'Firebase credentials missing. Firestore will not be available.',
      );
    }
  }

  getFirestore(): admin.firestore.Firestore {
    return this.db;
  }
}
