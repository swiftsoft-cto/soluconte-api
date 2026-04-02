import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dtos/create-conversation.dto';

@Controller('api/agents/conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova conversa com um agente' })
  @ApiResponse({ status: 201, description: 'Conversa criada.' })
  async create(@User() user: any, @Body() dto: CreateConversationDto) {
    const conversation = await this.conversationsService.create(
      user.id,
      dto.agentId,
      dto.title,
    );
    return { message: 'Conversa criada.', statusCode: 201, data: conversation };
  }

  @Get()
  @ApiOperation({ summary: 'Listar conversas do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de conversas.' })
  async findAll(@User() user: any, @Query('agentId') agentId?: string) {
    const conversations = await this.conversationsService.findAllByUser(
      user.id,
      agentId,
    );
    return { message: 'OK', statusCode: 200, data: conversations };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conversa com mensagens' })
  @ApiResponse({ status: 200, description: 'Conversa encontrada.' })
  async findOne(@Param('id') id: string, @User() user: any) {
    const conversation = await this.conversationsService.findOne(id, user.id);
    return { message: 'OK', statusCode: 200, data: conversation };
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensagens da conversa' })
  @ApiResponse({ status: 200, description: 'Lista de mensagens.' })
  async getMessages(@Param('id') id: string, @User() user: any) {
    const messages = await this.conversationsService.getMessages(id, user.id);
    return { message: 'OK', statusCode: 200, data: messages };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover conversa' })
  @ApiResponse({ status: 200, description: 'Conversa removida.' })
  async remove(@Param('id') id: string, @User() user: any) {
    await this.conversationsService.remove(id, user.id);
    return { message: 'Conversa removida.', statusCode: 200 };
  }
}
