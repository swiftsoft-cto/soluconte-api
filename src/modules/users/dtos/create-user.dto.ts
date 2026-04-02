import { IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @Length(1, 256)
  name: string;

  // Novo campo, obrigatório no "create"
  @IsString()
  @Length(1, 256)
  lastName: string;

  @IsString()
  @Length(1, 256)
  email: string;

  // Deixe opcional caso o usuário possa ser criado sem senha (funcionários que não logarão)
  @IsOptional()
  @IsString()
  @Length(6, 256)
  password?: string;

  // IDs das roles
  @IsString()
  @Length(1, 256)
  role: string;

  @IsString()
  @Length(11, 15) // Ex.: validação p/ CPF ou CNPJ sem formatação
  @IsOptional()
  document?: string;

  // Renomeado: codeCountry -> countryCode
  @IsString()
  @IsOptional()
  @Length(1, 5)
  countryCode?: string;

  @IsString()
  @Length(10, 14)
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  // Se a data vier em formato string (ISO 8601)
  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @IsString()
  @IsOptional()
  @Length(1, 11)
  postalCode?: string;

  @IsString()
  @IsOptional()
  @Length(1, 256)
  address?: string;

  // Novo campo
  @IsString()
  @IsOptional()
  @Length(1, 256)
  addressNumber?: string;

  // Novo campo
  @IsString()
  @IsOptional()
  @Length(1, 256)
  addressComplement?: string;

  // Novo campo
  @IsString()
  @IsOptional()
  @Length(1, 256)
  neighborhood?: string;

  // Novo campo
  @IsString()
  @IsOptional()
  @Length(1, 256)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(1, 256)
  state?: string;

  @IsString()
  @IsOptional()
  @Length(1, 256)
  country?: string;

  // Novo campo
  @IsString()
  @IsOptional()
  observations?: string;

  // Novo campo imagem
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  imageUrl?: string;
}
