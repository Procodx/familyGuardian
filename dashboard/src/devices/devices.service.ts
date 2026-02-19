import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterDeviceDto, DeviceResponseDto } from './devices.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class DevicesService {
  private readonly collectionName = 'devices';
  private readonly panicCollection = 'panicEvents';

  constructor(private firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  async register(dto: RegisterDeviceDto): Promise<DeviceResponseDto> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    const deviceRef = this.db.collection(this.collectionName).doc(dto.deviceId);
    const doc = await deviceRef.get();

    if (doc.exists) {
      throw new ConflictException('Device already registered');
    }

    const deviceToken = uuidv4();
    const newDevice = {
      ...dto,
      deviceToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      status: 'normal',
      lastLocation: null,
    };

    await deviceRef.set(newDevice);
    return {
      deviceId: newDevice.deviceId,
      deviceName: newDevice.deviceName,
      deviceToken: newDevice.deviceToken,
      registeredAt: new Date(), // This will be approximate since we use serverTimestamp
    };
  }

  async findAll(): Promise<any[]> {
    if (!this.db) return [];
    const snapshot = await this.db.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async findByToken(token: string): Promise<any | null> {
    if (!this.db) return null;
    const snapshot = await this.db
      .collection(this.collectionName)
      .where('deviceToken', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  }

  async validateDeviceToken(token: string): Promise<any | null> {
    return this.findByToken(token);
  }

  async updateStatus(
    deviceId: string,
    status: 'normal' | 'critical' | 'online' | 'offline',
  ) {
    if (!this.db) return;
    await this.db.collection(this.collectionName).doc(deviceId).update({
      status,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async updateLocation(
    deviceId: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
    },
    batteryLevel?: number,
  ) {
    if (!this.db) return;
    await this.db
      .collection(this.collectionName)
      .doc(deviceId)
      .update({
        lastLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        batteryLevel: batteryLevel ?? null,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  async triggerPanic(deviceId: string, locationData: any): Promise<string> {
    if (!this.db) throw new Error('Firestore not initialized');

    // 1. Update Device Status to Critical
    await this.updateStatus(deviceId, 'critical');

    // 2. Persist Alert to panicEvents
    const panicDoc = await this.db.collection(this.panicCollection).add({
      deviceId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      batteryLevel: locationData.batteryLevel,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      acknowledged: false,
      status: 'active',
    });

    return panicDoc.id;
  }

  async logSmsResults(panicId: string, logs: any[]): Promise<void> {
    if (!this.db) return;
    await this.db.collection(this.panicCollection).doc(panicId).update({
      smsLog: logs,
    });
  }

  async acknowledgePanic(panicId: string): Promise<string | null> {
    if (!this.db) return null;

    const panicRef = this.db.collection(this.panicCollection).doc(panicId);
    const panicDoc = await panicRef.get();

    if (!panicDoc.exists) {
      throw new NotFoundException('Panic event not found');
    }

    const panicData = panicDoc.data();
    if (!panicData) {
      throw new NotFoundException('Panic data corrupted');
    }
    const deviceId = panicData.deviceId;

    // 1. Update Panic Document
    await panicRef.update({
      acknowledged: true,
      status: 'resolved',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Reset Device Status to normal
    await this.updateStatus(deviceId, 'normal');

    return deviceId;
  }
}
