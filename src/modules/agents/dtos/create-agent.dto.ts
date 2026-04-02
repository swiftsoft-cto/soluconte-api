import { IsString, IsOptional, MaxLength, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: 'Assistente de Vendas' })
  @IsString()
  @MaxLength(256)
  name: string;

  @ApiPropertyOptional({ example: 'Ajuda a equipe com dúvidas sobre produtos e processos.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Você é um assistente prestativo. Responda em português. Seja conciso.',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Sugestões de início de conversa', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conversationStarters?: string[];

  @ApiPropertyOptional({ description: 'Modelo recomendado (ex: gpt-4o-mini)', example: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  recommendedModel?: string;

  @ApiPropertyOptional({
    description: 'Escopo: general | client | internal',
    example: 'general',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Quando scope=client, ID da empresa (cliente) vinculada',
  })
  @IsOptional()
  @IsString()
  linkedCompanyId?: string;

  @ApiPropertyOptional({
    description: 'Define se o agente está ativo no chat',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
