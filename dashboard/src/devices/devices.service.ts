import { Injectable, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDeviceDto, DeviceResponseDto } from './devices.dto';

interface DeviceRecord {
  deviceName: string;
  deviceId: string;
  deviceToken: string;
  registeredAt: Date;
}

@Injectable()
export class DevicesService {
  private devices: Map<string, DeviceRecord> = new Map();

  async register(dto: RegisterDeviceDto): Promise<DeviceResponseDto> {
    if (this.devices.has(dto.deviceId)) {
      throw new ConflictException('Device already registered');
    }

    const deviceToken = uuidv4();
    const newDevice: DeviceRecord = {
      ...dto,
      deviceToken,
      registeredAt: new Date(),
    };

    this.devices.set(dto.deviceId, newDevice);
    return newDevice;
  }

  async findAll(): Promise<DeviceResponseDto[]> {
    return Array.from(this.devices.values());
  }

  async validateDeviceToken(token: string): Promise<boolean> {
    const allDevices = Array.from(this.devices.values());
    return allDevices.some(d => d.deviceToken === token);
  }
}
