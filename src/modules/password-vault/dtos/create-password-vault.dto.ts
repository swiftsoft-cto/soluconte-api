import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePasswordVaultDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Aceitar qualquer string (sem validação de UUID)
  @IsString()
  @IsNotEmpty()
  companyId: string;
}






