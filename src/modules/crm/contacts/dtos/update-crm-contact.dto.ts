import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateCrmContactDto {
  @ApiProperty({
    description: 'Nome do contato',
    example: 'João',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  name?: string;

  @ApiProperty({
    description: 'Sobrenome do contato',
    example: 'Silva',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  lastname?: string;

  @ApiProperty({
    description: 'Cargo do contato',
    example: 'Gerente',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  role?: string;

  @ApiProperty({
    description: 'Email do contato',
    example: 'joao.silva@empresa.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  email?: string;

  @ApiProperty({
    description: 'Telefone do contato',
    example: '(11) 99999-9999',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiProperty({
    description: 'Tratamento do contato',
    example: 'Sr.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  treatment?: string;

  @ApiProperty({
    description: 'ID da empresa',
    example: 'UUID',
    required: false,
  })
  @IsOptional()
  companyId?: string;
}
