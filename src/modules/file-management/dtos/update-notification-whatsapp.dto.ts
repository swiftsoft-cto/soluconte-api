import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateNotificationWhatsAppDto {
  @IsOptional()
  @IsString()
  @Matches(/^(\+?[1-9]\d{1,14}|\d+@g\.us)$/, {
    message: 'Número de telefone ou ID de grupo inválido. Use o formato internacional (ex: 5511999999999) ou ID de grupo (ex: 120363123456789012@g.us)',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  departmentId?: string | null; // null = Geral
}



