import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
    const token = client.handshake.query.deviceToken as string;

    if (!token) {
      console.log(
        `Connection rejected: No deviceToken provided (Client: ${client.id})`,
      );
      client.disconnect();
      return;
    }

    const isValid = await this.devicesService.validateDeviceToken(token);
    if (!isValid) {
      console.log(
        `Connection rejected: Invalid deviceToken (Client: ${client.id})`,
      );
      client.disconnect();
      return;
    }

    console.log(`Device connected: ${client.id} (Token: ${token})`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('location_update')
  handleLocationUpdate(@MessageBody() data: any) {
    console.log('Location update received:', data);
    // Broadcast to all connected clients
    this.server.emit('device_location_update', data);
    return { event: 'location_update', data };
  }

  @SubscribeMessage('panic_alert')
  handlePanicAlert(@MessageBody() data: any) {
    console.log('Panic alert received:', data);
    // Broadcast to all connected clients
    this.server.emit('device_panic_triggered', data);
    return { event: 'panic_alert', data };
  }
}
