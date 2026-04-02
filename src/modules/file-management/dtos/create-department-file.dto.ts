import { IsString, IsOptional, IsInt, IsNotEmpty } from 'class-validator';

export class CreateDepartmentFileDto {
  @IsString()
  @IsNotEmpty()
  folderId: string;

  @IsInt()
  year: number;

  @IsInt()
  month: number;

  @IsOptional()
  @IsString()
  description?: string;
}
