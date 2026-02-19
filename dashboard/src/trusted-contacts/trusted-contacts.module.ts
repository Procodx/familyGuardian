import { Module } from '@nestjs/common';
import { TrustedContactsService } from './trusted-contacts.service';
import { TrustedContactsController } from './trusted-contacts.controller';

@Module({
  providers: [TrustedContactsService],
  controllers: [TrustedContactsController],
  exports: [TrustedContactsService],
})
export class TrustedContactsModule {}
