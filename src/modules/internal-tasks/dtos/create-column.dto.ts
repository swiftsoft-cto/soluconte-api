import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreateColumnDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsString()
  kanbanId: string;
}
