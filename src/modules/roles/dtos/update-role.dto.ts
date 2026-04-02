// src/modules/roles/dtos/update-role.dto.ts
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(1, 256)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 256)
  description?: string;

  @IsOptional()
  @IsString()
  bossRoleId?: string;

  @IsOptional()
  departmentIds?: any[];
}
