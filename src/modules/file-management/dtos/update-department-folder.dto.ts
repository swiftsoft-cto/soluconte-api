import { IsString, IsOptional } from 'class-validator';

export class UpdateDepartmentFolderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
