import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { AlertsModule } from './alerts/alerts.module';
import { MapsModule } from './maps/maps.module';
import { FirebaseModule } from './firebase/firebase.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SmsModule } from './sms/sms.module';
import { TrustedContactsModule } from './trusted-contacts/trusted-contacts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DevicesModule,
    AlertsModule,
    MapsModule,
    FirebaseModule,
    RealtimeModule,
    SmsModule,
    TrustedContactsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
