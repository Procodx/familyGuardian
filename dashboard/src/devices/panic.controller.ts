import {
  Controller,
  Patch,
  Param,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DevicesService } from './devices.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('panic')
export class PanicController {
  constructor(
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Patch(':panicId/acknowledge')
  async acknowledge(@Param('panicId') panicId: string) {
    const deviceId = await this.devicesService.acknowledgePanic(panicId);

    if (deviceId) {
      // Emit panic_resolved WebSocket event
      this.realtimeGateway.server.emit('panic_resolved', {
        panicId,
        deviceId,
        status: 'normal',
      });

      // Also emit status update for UI consistency
      this.realtimeGateway.server.emit('device_status_update', {
        deviceId,
        status: 'normal',
      });
    }

    return { status: 'acknowledged', panicId, deviceId };
  }
}
