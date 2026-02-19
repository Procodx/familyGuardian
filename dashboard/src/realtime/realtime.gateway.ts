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
        await this.devicesService.updateStatus(device.deviceId, 'online');
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
    await this.devicesService.updateLocation(device.deviceId, data);

    // Broadcast to dashboard clients
    this.server.emit('device_location_update', {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      ...data,
    });

    return { status: 'ok' };
  }

  @SubscribeMessage('panic_alert')
  handlePanicAlert(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const device = client.data.device;
    if (!device) return;

    console.log(`PANIC ALERT from ${device.deviceName}:`, data);

    // Broadcast to all connected clients
    this.server.emit('device_panic_triggered', {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      timestamp: Date.now(),
      ...data,
    });

    return { status: 'alert_broadcasted' };
  }
}
