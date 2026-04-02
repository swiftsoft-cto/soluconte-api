import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: 'ID da conversa ou "new" para nova conversa' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Texto da mensagem do usuário' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'ID do agente (usado se conversationId for novo)' })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
