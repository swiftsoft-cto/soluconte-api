import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateCrmStageDto {
  @ApiProperty({ description: 'Nome do estágio', example: 'Primeiro Contato' })
  @IsString()
  @Length(1, 256)
  name: string;

  @ApiProperty({
    description: 'Descrição do estágio',
    example: 'Estágio inicial do processo de vendas',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Meta do estágio', example: 100 })
  @IsNumber()
  @Min(0)
  goal: number;

  @ApiProperty({ description: 'Taxa de conversão do estágio', example: 25.5 })
  @IsNumber()
  @Min(0)
  conversion: number;

  @ApiProperty({
    description: 'Cor do estágio em formato hexadecimal',
    example: '#FF5733',
  })
  @IsString()
  @Length(7, 7)
  color: string;

  @ApiProperty({ description: 'Ordem do estágio no funil', example: 'UUID' })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'ID do funil associado', example: 'UUID' })
  funnelId: string;
}
