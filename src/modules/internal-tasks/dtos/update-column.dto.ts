import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
