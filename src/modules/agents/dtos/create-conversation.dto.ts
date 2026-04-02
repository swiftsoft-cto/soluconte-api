import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID do agente' })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({ description: 'Título inicial da conversa' })
  @IsOptional()
  title?: string;
}
