import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCrmCompanyDto {
  @ApiProperty({
    description: 'CNPJ da empresa',
    example: '12345678901234',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 18)
  cnpj?: string;

  @ApiProperty({
    description: 'Razão Social da empresa',
    example: 'Empresa LTDA',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  razaoSocial?: string;

  @ApiProperty({
    description: 'Nome Fantasia da empresa',
    example: 'Empresa',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  nomeFantasia?: string;

  @ApiProperty({
    description: 'Situação da empresa',
    example: 'ATIVA',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  situacao?: string;

  @ApiProperty({
    description: 'Tipo da empresa',
    example: 'MATRIZ',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  tipoEmpresa?: string;

  @ApiProperty({
    description: 'Porte da empresa',
    example: 'GRANDE',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  porte?: string;

  @ApiProperty({
    description: 'Natureza Jurídica',
    example: 'SOCIEDADE LIMITADA',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  naturezaJuridica?: string;

  @ApiProperty({
    description: 'Capital Social',
    example: '1000000.00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  capitalSocial?: string;

  @ApiProperty({
    description: 'Atividade Principal',
    example: 'COMÉRCIO',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  atividadePrincipal?: string;

  @ApiProperty({
    description: 'Atividades Secundárias',
    example: ['ATIVIDADE1', 'ATIVIDADE2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  atividadesSecundarias?: string[];

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
