// src/modules/departments/dtos/create-department.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  aiId?: string;
}
