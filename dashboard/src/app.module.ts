import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { AlertsModule } from './alerts/alerts.module';
import { MapsModule } from './maps/maps.module';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [AuthModule, DevicesModule, AlertsModule, MapsModule, FirebaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
