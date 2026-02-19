import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateTrustedContactDto } from './trusted-contacts.dto';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export interface TrustedContact {
  contactId: string;
  deviceId: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  createdAt: any;
}

@Injectable()
export class TrustedContactsService {
  private readonly collectionName = 'trustedContacts';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.getFirestore();
  }

  async create(dto: CreateTrustedContactDto): Promise<TrustedContact> {
    const contactId = uuidv4();
    const contact: TrustedContact = {
      contactId,
      ...dto,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.db.collection(this.collectionName).doc(contactId).set(contact);
    return contact;
  }

  async findByDeviceId(deviceId: string): Promise<TrustedContact[]> {
    const snapshot = await this.db
      .collection(this.collectionName)
      .where('deviceId', '==', deviceId)
      .get();

    return snapshot.docs.map((doc) => doc.data() as TrustedContact);
  }

  async remove(contactId: string): Promise<void> {
    const docRef = this.db.collection(this.collectionName).doc(contactId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Trusted contact not found');
    }

    await docRef.delete();
  }
}
