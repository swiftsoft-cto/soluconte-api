import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsUrl, ValidateIf } from 'class-validator';

export class CreatePasswordEntryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.url && o.url.trim() !== '')
  @IsUrl({}, { message: 'URL deve ser um endereço válido' })
  url?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isRestricted?: boolean;

  @IsUUID()
  @IsNotEmpty()
  vaultId: string;
}
