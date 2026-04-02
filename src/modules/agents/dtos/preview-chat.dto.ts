import { IsString, IsUUID, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewChatDto {
  @ApiProperty()
  @IsUUID()
  agentId: string;

  @ApiProperty({ description: 'Histórico da conversa para manter contexto' })
  @IsArray()
  messages: { role: string; content: string }[];

  @ApiProperty()
  @IsString()
  content: string;
}
