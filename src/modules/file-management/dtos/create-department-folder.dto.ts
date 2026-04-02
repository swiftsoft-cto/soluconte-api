import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDepartmentFolderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsOptional()
  @IsString()
  companyId?: string; // Se fornecido, vincula a pasta ao cliente; se não, é pasta interna
}
