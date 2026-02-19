import { Module, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { DevicesModule } from '../devices/devices.module';
import { TrustedContactsModule } from '../trusted-contacts/trusted-contacts.module';

@Module({
  imports: [forwardRef(() => DevicesModule), TrustedContactsModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
