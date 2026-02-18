import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto, DeviceResponseDto } from './devices.dto';

@Controller('device')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  async register(@Body() dto: RegisterDeviceDto): Promise<DeviceResponseDto> {
    return this.devicesService.register(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('list')
  async list(): Promise<DeviceResponseDto[]> {
    return this.devicesService.findAll();
  }
}
