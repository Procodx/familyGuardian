import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../firebase/firebase.service';
import { RegisterDeviceDto, DeviceResponseDto } from './devices.dto';

@Injectable()
export class DevicesService {
  private readonly collectionName = 'devices';

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
      createdAt: new Date(),
      lastSeen: new Date(),
      status: 'offline',
      lastLocation: null,
    };

    await deviceRef.set(newDevice);
    return {
      deviceId: newDevice.deviceId,
      deviceName: newDevice.deviceName,
      deviceToken: newDevice.deviceToken,
      registeredAt: newDevice.createdAt,
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

  async updateStatus(deviceId: string, status: 'online' | 'offline') {
    if (!this.db) return;
    await this.db.collection(this.collectionName).doc(deviceId).update({
      status,
      lastSeen: new Date(),
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
  ) {
    if (!this.db) return;
    await this.db.collection(this.collectionName).doc(deviceId).update({
      lastLocation: location,
      lastSeen: new Date(),
    });
  }
}
