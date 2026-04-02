import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  Length,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCrmCompanyDto {
  @ApiProperty({
    description: 'CNPJ da empresa',
    example: '12345678901234',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  cnpj?: string | null;

  @ApiProperty({
    description: 'Razão Social da empresa',
    example: 'Empresa LTDA',
  })
  @IsString()
  @Length(1, 256)
  razaoSocial: string;

  @ApiProperty({ description: 'Nome Fantasia da empresa', example: 'Empresa' })
  @IsString()
  @Length(1, 256)
  nomeFantasia: string;

  @ApiProperty({ description: 'Situação da empresa', example: 'ATIVA' })
  @IsString()
  @Length(1, 50)
  situacao: string;

  @ApiProperty({ description: 'Tipo da empresa', example: 'MATRIZ' })
  @IsString()
  @Length(1, 50)
  tipoEmpresa: string;

  @ApiProperty({ description: 'Porte da empresa', example: 'GRANDE' })
  @IsString()
  @Length(1, 50)
  porte: string;

  @ApiProperty({
    description: 'Natureza Jurídica',
    example: 'SOCIEDADE LIMITADA',
  })
  @IsString()
  @Length(1, 100)
  naturezaJuridica: string;

  @ApiProperty({
    description: 'Capital Social',
    example: '1000000.00',
    type: Number,
  })
  @IsNumber()
  capitalSocial: number;

  @ApiProperty({ description: 'Atividade Principal', example: 'COMÉRCIO' })
  @IsString()
  @Length(1, 256)
  atividadePrincipal: string;

  @ApiProperty({
    description: 'Atividades Secundárias',
    example: ['ATIVIDADE1', 'ATIVIDADE2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  atividadesSecundarias: string[];

  @ApiProperty({
    description: 'URL do site',
    example: 'https://empresa.com.br',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? null : value))
  url?: string | null;

  @ApiProperty({
    description: 'Observações',
    example: 'Observações importantes',
    required: false,
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
