import { IsString, IsOptional, IsInt, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFileDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsOptional()
  @IsString()
  departmentId?: string; // Opcional: arquivos sem departamento ficam em "Geral"

  @IsInt()
  year: number;

  @IsInt()
  month: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sendToClient?: boolean; // Se true, arquivo é visível para o cliente e envia notificações (padrão: true)
}

















