import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationEmailDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  departmentId?: string; // null/omit = Geral
}

