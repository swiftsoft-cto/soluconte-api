import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CreateCompanyDto {
  @IsString()
  @IsOptional()
  cnpj?: string;

  @IsString()
  razaoSocial: string;

  @IsString()
  nomeFantasia: string;

  @IsString()
  situacao: string;

  @IsString()
  tipoEmpresa: string;

  @IsString()
  porte: string;

  @IsString()
  naturezaJuridica: string;

  @ApiProperty({
    description: 'Capital Social',
    example: '1000000.00',
    type: Number,
  })
  @IsNumber()
  @Transform(({ value }) => parseFloat(value) || 0)
  capitalSocial: number;

  @IsString()
  atividadePrincipal: string;

  @IsArray()
  @IsString({ each: true })
  atividadesSecundarias: string[];

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  observacoes?: string;
}

class CreateContactDto {
  @IsString()
  name: string;

  @IsString()
  lastname: string;

  @IsString()
  treatment: string;

  @IsString()
  role: string;

  @IsString()
  email: string;

  @IsString()
  phone: string;
}

export class CreateCrmNegotiationDto {
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCompanyDto)
  company?: CreateCompanyDto;

  @IsOptional()
  contactId?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContactDto)
  contact?: CreateContactDto;

  @IsUUID()
  funnelId: string;

  @IsUUID()
  stageId: string;

  @IsString()
  ownerId: string;

  @IsString()
  mainInterest: string;

  @IsString()
  @IsOptional()
  obs?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  origin?: string;

  @ApiProperty({
    description: 'Ordem da negociação no estágio',
    example: 1,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiProperty({
    description: 'Indica se a negociação foi perdida',
    example: false,
  })
  @IsOptional()
  isLost?: boolean;

  @ApiProperty({
    description: 'Indica se a negociação foi vencida',
    example: false,
  })
  @IsOptional()
  isWon?: boolean;
}
