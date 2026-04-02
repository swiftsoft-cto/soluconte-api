import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesGuard } from '../../common/guards/rules.guard';
import { Rule } from '../../common/decorators/rule.decorator';
import { WhatsAppThreadsService } from './whatsapp-threads.service';
import { SendThreadMessageDto } from './dto/send-thread-message.dto';
import { PatchThreadAiDto } from './dto/patch-thread-ai.dto';
import { User } from '../../common/decorators/user.decorator';

@ApiTags('WhatsApp')
@Controller('api/whatsapp')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class WhatsAppThreadsController {
  constructor(private readonly threadsService: WhatsAppThreadsService) {}

  @Get('threads')
  @Rule('team')
  @ApiOperation({ summary: 'Listar conversas 1:1 persistidas (threads)' })
  listThreads(@Query('deviceId') deviceId?: string) {
    return this.threadsService.listThreads(deviceId);
  }

  @Get('threads/:threadId/messages')
  @Rule('team')
  @ApiOperation({ summary: 'Listar mensagens de uma thread' })
  listMessages(@Param('threadId', ParseUUIDPipe) threadId: string) {
    return this.threadsService.listMessages(threadId);
  }

  @Post('threads/:threadId/messages')
  @Rule('team')
  @ApiOperation({ summary: 'Enviar texto ao contato (e gravar como outbound)' })
  sendMessage(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Body() dto: SendThreadMessageDto,
  ) {
    return this.threadsService.sendOutboundText(threadId, dto.text);
  }

  @Patch('threads/:threadId/read')
  @Rule('team')
  @ApiOperation({ summary: 'Zerar não lidas da thread' })
  markRead(@Param('threadId', ParseUUIDPipe) threadId: string) {
    return this.threadsService.markRead(threadId);
  }

  @Patch('threads/:threadId/ai')
  @Rule('team')
  @ApiOperation({
    summary: 'Ativar/desativar IA na thread (agentId opcional)',
  })
  patchAi(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Body() dto: PatchThreadAiDto,
    @User() user: { id: string },
  ) {
    return this.threadsService.patchAi(
      threadId,
      dto.enabled,
      dto.agentId,
      user.id,
    );
  }
}
