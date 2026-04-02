import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWhatsAppDeviceDto {
  @ApiProperty({ example: 'Financeiro' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: '+55 11 4000-2101' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phoneLabel?: string;

  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatorLabel?: string;
}
