import { PartialType } from '@nestjs/mapped-types';
import { CreatePasswordEntryDto } from './create-password-entry.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePasswordEntryDto extends PartialType(CreatePasswordEntryDto) {
  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  encryptedPassword?: string;
}
