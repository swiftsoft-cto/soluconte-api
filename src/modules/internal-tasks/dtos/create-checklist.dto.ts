import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ChecklistType } from '../entities/checklist.entity';

export class CreateChecklistItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}

export class CreateChecklistDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ChecklistType)
  type: ChecklistType;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  items: CreateChecklistItemDto[];
}










