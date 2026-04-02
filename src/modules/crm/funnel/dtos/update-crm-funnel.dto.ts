import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional } from 'class-validator';

export class UpdateCrmFunnelDto {
  @ApiProperty({
    description: 'Nome do funil',
    example: 'Funil de Vendas',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  name?: string;

  @ApiProperty({
    description: 'Descrição do funil',
    example: 'Funil de vendas para clientes premium',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Cor do funil em formato hexadecimal',
    example: '#FF5733',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(7, 7)
  color?: string;

  @ApiProperty({
    description: 'ID do time associado',
    example: 'UUID',
    required: false,
  })
  @IsOptional()
  teamId?: string;
}
