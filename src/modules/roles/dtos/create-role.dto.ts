// src/modules/roles/dtos/create-role.dto.ts
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(1, 256)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bossRoleId?: string;

  @IsOptional()
  departmentIds?: string[];
}
