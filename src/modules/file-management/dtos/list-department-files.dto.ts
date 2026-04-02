import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ListDepartmentFilesDto {
  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  month?: number;
}
