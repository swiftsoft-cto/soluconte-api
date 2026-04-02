import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendCommunicationDto {
  @IsNotEmpty({ message: 'A mensagem é obrigatória.' })
  @IsString()
  @MaxLength(4096, { message: 'A mensagem pode ter no máximo 4096 caracteres.' })
  message: string;

  @IsOptional()
  @IsString()
  departmentId?: string; // omit = todos os grupos; "geral" ou uuid = filtrar por departamento
}
