import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class CreateTrustedContactDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  relationship: string;
}
