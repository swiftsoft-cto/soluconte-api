import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ description: 'CNPJ da empresa' })
  @IsString()
  @IsOptional()
  cnpj?: string;

  @ApiProperty({ description: 'Nome do contato' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email do contato' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Telefone do contato' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Serviço de interesse' })
  @IsString()
  @IsNotEmpty()
  interestService: string;

  @ApiProperty({ description: 'Mensagem do lead' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'ID do estágio onde o lead será criado' })
  @IsUUID()
  @IsNotEmpty()
  stageId: string;

  @ApiProperty({ description: 'Origem do lead', required: false })
  @IsString()
  @IsOptional()
  origin?: string;
}
