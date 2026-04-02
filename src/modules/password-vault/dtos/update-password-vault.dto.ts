import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdatePasswordVaultDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}























