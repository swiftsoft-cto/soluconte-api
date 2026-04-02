import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dtos/chat-message.dto';
import { PreviewChatDto } from './dtos/preview-chat.dto';

@Controller('api/agents/chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Enviar mensagem e receber resposta do agente' })
  @ApiResponse({ status: 200, description: 'Resposta do assistente.' })
  async sendMessage(@User() user: any, @Body() dto: ChatMessageDto) {
    const result = await this.chatService.sendMessage(
      user.id,
      dto.conversationId,
      dto.content,
      dto.agentId,
      user,
    );
    return {
      message: 'OK',
      statusCode: 200,
      data: result,
    };
  }

  @Post('preview')
  @ApiOperation({ summary: 'Pré-visualizar chat (não persiste); mantém contexto' })
  @ApiResponse({ status: 200, description: 'Resposta do assistente.' })
  async preview(@User() user: any, @Body() dto: PreviewChatDto) {
    const result = await this.chatService.preview(
      user.id,
      dto.agentId,
      dto.messages ?? [],
      dto.content,
      user,
    );
    return { message: 'OK', statusCode: 200, data: result };
  }
}
