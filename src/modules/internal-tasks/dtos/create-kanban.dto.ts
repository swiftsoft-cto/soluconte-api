import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateKanbanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  departmentId: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
