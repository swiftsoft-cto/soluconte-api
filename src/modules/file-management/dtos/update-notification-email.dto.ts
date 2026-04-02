import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationEmailDto {
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  departmentId?: string | null; // null = Geral
}

