import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';
import { DevicesService } from '../devices/devices.service';
import { SmsService } from '../sms/sms.service';
import { TrustedContactsService } from '../trusted-contacts/trusted-contacts.service';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly devicesService: DevicesService,
    private readonly smsService: SmsService,
    private readonly trustedContactsService: TrustedContactsService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const deviceToken = client.handshake.query.deviceToken as string;
    const adminToken =
      client.handshake.auth?.token || client.handshake.query.token;

    // Case 1: Device connection
    if (deviceToken) {
      const device = await this.devicesService.validateDeviceToken(deviceToken);
      if (device) {
        client.data.device = device;
        client.data.type = 'device';
        await this.devicesService.updateStatus(device.deviceId, 'normal');

        // Notify dashboard of status change
        this.server.emit('device_status_update', {
          deviceId: device.deviceId,
          status: 'normal',
        });

        console.log(
          `Device connected: ${device.deviceName} (${device.deviceId})`,
        );
        return;
      }
    }

    // Case 2: Dashboard/Admin connection (Simplified for now, should ideally verify JWT)
    if (adminToken) {
      client.data.type = 'admin';
      console.log(`Admin dashboard connected: ${client.id}`);
      return;
    }

    console.log(`Connection rejected: Unauthorized (Client: ${client.id})`);
    client.disconnect();
  }

  async handleDisconnect(client: Socket) {
    const device = client.data.device;
    if (device) {
      // Mark as offline
      await this.devicesService.updateStatus(device.deviceId, 'offline');

      // Notify dashboard of status change
      this.server.emit('device_status_update', {
        deviceId: device.deviceId,
        status: 'offline',
      });

      console.log(
        `Device disconnected: ${device.deviceName} (${device.deviceId})`,
      );
    } else {
      console.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('location_update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number;
      batteryLevel?: number;
    },
  ) {
    const device = client.data.device;
    if (!device) return;

    // Validate coordinates
    if (
      typeof data.latitude !== 'number' ||
      typeof data.longitude !== 'number'
    ) {
      console.warn(`Invalid coordinates from ${device.deviceId}`);
      return;
    }

    console.log(`Location update from ${device.deviceName}:`, data);

    // Update Firestore
    await this.devicesService.updateLocation(
      device.deviceId,
      data,
      data.batteryLevel,
    );

    // Broadcast to dashboard clients
    this.server.emit('device_location_update', {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      ...data,
      lastSeen: new Date().toISOString(),
    });

    return { status: 'ok' };
  }

  @SubscribeMessage('panic_alert')
  async handlePanicAlert(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const device = client.data.device;
    if (!device) return;

    console.log(`PANIC ALERT from ${device.deviceName}:`, data);

    // Persist to Firestore and get panicId
    const panicId = await this.devicesService.triggerPanic(
      device.deviceId,
      data,
    );

    // --- SMS ESCALATION LAYER ---
    try {
      // Step A: Fetch Trusted Contacts
      const contacts = await this.trustedContactsService.findByDeviceId(
        device.deviceId,
      );

      // Step B: Construct Message
      const lat = data.latitude || (data as any).lat || 0;
      const lng = data.longitude || (data as any).lng || 0;
      const message = `🚨 EMERGENCY ALERT 🚨\nDevice: ${device.deviceName}\nLocation: https://maps.google.com/?q=${lat},${lng}\nBattery: ${data.batteryLevel}%\nTime: ${new Date().toLocaleString()}`;

      // Step C: Prepare Recipients
      const recipients = contacts.map((c) => c.phoneNumber);
      const adminFallback = this.configService.get<string>(
        'ADMIN_FALLBACK_NUMBER',
      );
      if (adminFallback) recipients.push(adminFallback);

      // Step D: Send SMS to everyone
      const smsPromises = recipients.map((phone) =>
        this.smsService.sendPanicAlert(phone, message),
      );

      const results = await Promise.all(smsPromises);

      // Step E: Log Results to Firestore
      const smsLog = results.map((res) => ({
        phoneNumber: res.phoneNumber,
        success: res.success,
        timestamp: new Date().toISOString(),
        error: res.error,
      }));

      await this.devicesService.logSmsResults(panicId, smsLog);
    } catch (error) {
      console.error('SMS Escalation failed:', error);
    }

    // Broadcast to all connected clients
    this.server.emit('device_panic_triggered', {
      panicId,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      timestamp: Date.now(),
      ...data,
    });

    return { status: 'alert_broadcasted_and_persisted', panicId };
  }
}
