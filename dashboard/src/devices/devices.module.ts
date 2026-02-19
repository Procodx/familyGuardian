import { Module, forwardRef } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { PanicController } from './panic.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  providers: [DevicesService],
  controllers: [DevicesController, PanicController],
  exports: [DevicesService],
})
export class DevicesModule {}
