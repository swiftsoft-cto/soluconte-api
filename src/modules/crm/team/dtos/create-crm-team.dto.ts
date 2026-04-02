import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional } from 'class-validator';

export class CreateCrmTeamDto {
  @ApiProperty({ description: 'Nome do time', example: 'Time de Vendas' })
  @IsString()
  @Length(1, 256)
  name: string;

  @ApiProperty({
    description: 'Descrição do time',
    example: 'Time responsável por vendas',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
