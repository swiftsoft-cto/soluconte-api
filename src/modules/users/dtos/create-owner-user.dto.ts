import {
  IsArray,
  IsString,
  Length,
  IsOptional,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOwnerUserDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || !value ? undefined : value))
  @ValidateIf((o) => o.name !== undefined && o.name !== '')
  @Length(1, 256)
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || !value ? undefined : value))
  @ValidateIf((o) => o.lastName !== undefined && o.lastName !== '')
  @Length(1, 256)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || !value ? undefined : value))
  @ValidateIf((o) => o.email !== undefined && o.email !== '')
  @Length(1, 256)
  email?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((obj) => obj.password !== '' && obj.password !== undefined)
  @Length(6, 256)
  password?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || !value ? undefined : value))
  @ValidateIf((o) => o.role !== undefined && o.role !== '')
  @Length(1, 256)
  role?: string;

  @IsString()
  companyName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentNames?: string[];

  @IsString()
  @Length(11, 15) // Validação para números de cpf ou cnpj (sem formatação) - Obrigatório como CNPJ da empresa
  document: string;

  @IsString()
  @IsOptional()
  codeCountry?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || !value ? undefined : value))
  @ValidateIf((o) => o.phone !== undefined && o.phone !== '')
  @Length(10, 14) // Validação para números de telefone (sem formatação)
  phone?: string;

  @IsDateString() // Validação para strings no formato de data (ISO 8601)
  @IsOptional()
  birthdate?: string; // Use `string` para refletir o formato da entrada (ISO 8601)

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  dontMail?: boolean;
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  addressNumber?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  addressComplement?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  city?: string;
}
