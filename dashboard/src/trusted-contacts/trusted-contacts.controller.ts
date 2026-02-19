import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrustedContactsService } from './trusted-contacts.service';
import { CreateTrustedContactDto } from './trusted-contacts.dto';

@Controller('trusted-contacts')
@UseGuards(AuthGuard('jwt'))
export class TrustedContactsController {
  constructor(
    private readonly trustedContactsService: TrustedContactsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateTrustedContactDto) {
    return this.trustedContactsService.create(dto);
  }

  @Get(':deviceId')
  async findByDeviceId(@Param('deviceId') deviceId: string) {
    return this.trustedContactsService.findByDeviceId(deviceId);
  }

  @Delete(':contactId')
  async remove(@Param('contactId') contactId: string) {
    await this.trustedContactsService.remove(contactId);
    return { status: 'deleted', contactId };
  }
}
