// src/modules/companies/dtos/update-company.dto.ts
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsEmail,
  MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  companyType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  legalNature?: string;

  @IsOptional()
  // ou use um decorator como @IsNumber() (precision e scale é a cargo do typeorm)
  capital?: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  mainActivity?: string;

  @IsOptional()
  @IsArray()
  secondaryActivities?: string[];

  @IsOptional()
  @IsEmail()
  @MaxLength(256)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipCode?: string;

  @IsOptional()
  @IsBoolean()
  simpleOption?: boolean;

  @IsOptional()
  @IsBoolean()
  simeiOption?: boolean;
}
