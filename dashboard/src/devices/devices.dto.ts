import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  pairingCode?: string;
}

export class DeviceResponseDto {
  deviceName: string;
  deviceId: string;
  deviceToken: string;
  registeredAt: Date;
}
